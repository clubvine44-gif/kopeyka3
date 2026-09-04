/**
 * Finna SecureStore — AES-GCM encryption for local state.
 * Device-local key (not a password): protects against casual
 * file/backup inspection. Not a substitute for full-disk encryption.
 *
 * CRITICAL: never overwrite an existing FINENC1 payload with empty/default
 * state when decrypt fails — that is how data was wiped in intermediate builds.
 */
(function (global) {
  'use strict';

  var INSTALL_KEY = 'finna_install_id_v1';
  var ENC_PREFIX = 'FINENC1:';
  var LEGACY_MIGRATED = 'finna_state_enc_v1';
  var RAW_BACKUP_KEY = 'kopeyka3_state_v1__raw_backup';
  var _ready = null;
  var _cryptoKey = null;

  function b64FromBuf(buf) {
    var bytes = new Uint8Array(buf);
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function bufFromB64(b64) {
    var s = atob(b64);
    var bytes = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
    return bytes.buffer;
  }
  function getInstallId() {
    try {
      var id = localStorage.getItem(INSTALL_KEY);
      if (id && id.length >= 16) return id;
      var arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      id = Array.prototype.map.call(arr, function (b) {
        return ('0' + b.toString(16)).slice(-2);
      }).join('');
      localStorage.setItem(INSTALL_KEY, id);
      return id;
    } catch (e) {
      return 'finna-fallback-install-id';
    }
  }

  function deriveKey() {
    var id = getInstallId();
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(id), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: enc.encode('finna-secure-store-v1'),
          iterations: 120000,
          hash: 'SHA-256'
        },
        base,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    });
  }

  function init() {
    if (_ready) return _ready;
    if (!global.crypto || !crypto.subtle) {
      _ready = Promise.resolve(false);
      return _ready;
    }
    _ready = deriveKey().then(function (k) {
      _cryptoKey = k;
      return true;
    }).catch(function () {
      _cryptoKey = null;
      return false;
    });
    return _ready;
  }

  function encryptString(plain) {
    if (!_cryptoKey) return Promise.resolve(plain);
    var iv = new Uint8Array(12);
    crypto.getRandomValues(iv);
    var enc = new TextEncoder();
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, _cryptoKey, enc.encode(plain)).then(function (ct) {
      return ENC_PREFIX + b64FromBuf(iv.buffer) + ':' + b64FromBuf(ct);
    });
  }

  function decryptString(raw) {
    if (!_cryptoKey) return Promise.resolve(null);
    if (!raw || raw.indexOf(ENC_PREFIX) !== 0) {
      return Promise.resolve(raw);
    }
    var body = raw.slice(ENC_PREFIX.length);
    var parts = body.split(':');
    if (parts.length < 2) return Promise.resolve(null);
    var iv = new Uint8Array(bufFromB64(parts[0]));
    var ct = bufFromB64(parts.slice(1).join(':'));
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, _cryptoKey, ct).then(function (buf) {
      return new TextDecoder().decode(buf);
    }).catch(function () {
      return null;
    });
  }

  function isEmptyState(obj) {
    if (!obj || typeof obj !== 'object') return true;
    var inc = obj.income || [];
    var exp = obj.expenses || [];
    var res = obj.reserves || [];
    var deb = obj.debts || [];
    var obl = obj.obligations || [];
    var hasData = (inc.length + exp.length + res.length + deb.length + obl.length) > 0;
    var bal = 0;
    try { bal = Number((obj.settings && obj.settings.openingBalance) || 0); } catch (e) {}
    return !hasData && !bal;
  }

  function loadState(storageKey, defFn, normFn) {
    return init().then(function () {
      var raw = null;
      try {
        raw = localStorage.getItem(storageKey);
      } catch (e) {
        return defFn();
      }
      if (!raw) {
        // try emergency backup
        try {
          var bak = localStorage.getItem(RAW_BACKUP_KEY);
          if (bak) raw = bak;
        } catch (e2) {}
      }
      if (!raw) return defFn();

      function parseOk(text) {
        try {
          return normFn(JSON.parse(text));
        } catch (e) {
          return null;
        }
      }

      if (raw.indexOf(ENC_PREFIX) === 0) {
        // preserve encrypted blob before any write path
        try { localStorage.setItem(RAW_BACKUP_KEY, raw); } catch (e) {}
        return decryptString(raw).then(function (text) {
          if (!text) {
            // DECRYPT FAILED — do NOT wipe. Flag for UI recovery.
            try {
              global.__FIN_DECRYPT_FAILED = true;
              global.__FIN_LOCKED_RAW = raw;
            } catch (e) {}
            return null; // caller must not save empty over this
          }
          var st = parseOk(text);
          if (!st) {
            try {
              global.__FIN_DECRYPT_FAILED = true;
              global.__FIN_LOCKED_RAW = raw;
            } catch (e) {}
            return null;
          }
          try {
            global.__FIN_DECRYPT_FAILED = false;
            global.__FIN_LOCKED_RAW = null;
          } catch (e) {}
          return st;
        });
      }
      // Legacy plaintext → migrate to encrypted
      var state = parseOk(raw);
      if (!state) return defFn();
      return encryptString(JSON.stringify(state)).then(function (enc) {
        try {
          localStorage.setItem(storageKey, enc);
          localStorage.setItem(LEGACY_MIGRATED, '1');
          localStorage.setItem(RAW_BACKUP_KEY, enc);
        } catch (e) {}
        return state;
      }).catch(function () {
        return state;
      });
    });
  }

  function saveState(storageKey, stateObj) {
    // Refuse to overwrite a locked encrypted blob with empty state
    try {
      if (global.__FIN_DECRYPT_FAILED && isEmptyState(stateObj)) {
        return Promise.resolve(false);
      }
      var existing = localStorage.getItem(storageKey);
      if (existing && existing.indexOf(ENC_PREFIX) === 0 && isEmptyState(stateObj)) {
        return Promise.resolve(false);
      }
    } catch (e) {}

    var plain = JSON.stringify(stateObj);
    return init().then(function () {
      if (!_cryptoKey) {
        try {
          localStorage.setItem(storageKey, plain);
        } catch (e) {}
        return false;
      }
      return encryptString(plain).then(function (enc) {
        try {
          localStorage.setItem(storageKey, enc);
          localStorage.setItem(RAW_BACKUP_KEY, enc);
        } catch (e) {}
        return true;
      }).catch(function () {
        try {
          localStorage.setItem(storageKey, plain);
        } catch (e) {}
        return false;
      });
    });
  }

  global.FinSecureStore = {
    init: init,
    loadState: loadState,
    saveState: saveState,
    isEncryptedPayload: function (s) {
      return typeof s === 'string' && s.indexOf(ENC_PREFIX) === 0;
    },
    isEmptyState: isEmptyState,
    ENC_PREFIX: ENC_PREFIX,
    RAW_BACKUP_KEY: RAW_BACKUP_KEY
  };
})(typeof window !== 'undefined' ? window : this);
