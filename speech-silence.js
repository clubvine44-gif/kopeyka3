(function(){
  'use strict';
  if (window.__finSpeechSilencePatched) return;
  window.__finSpeechSilencePatched = true;

  function bridge(){
    try { return window.FinBridge || null; } catch(e) { return null; }
  }

  function patch(Ctor){
    if (!Ctor || !Ctor.prototype || Ctor.prototype.__finSpeechSilencePatched) return;
    var proto = Ctor.prototype;
    var originalStart = proto.start;
    var originalStop = proto.stop;
    var originalAbort = proto.abort;
    if (typeof originalStart === 'function') {
      proto.start = function(){
        var b = bridge();
        try { if (b && b.silenceSpeechFeedback) b.silenceSpeechFeedback(); } catch(e) {}
        try { return originalStart.apply(this, arguments); }
        catch(e) {
          try { if (b && b.restoreSpeechFeedback) b.restoreSpeechFeedback(); } catch(x) {}
          throw e;
        }
      };
    }
    function finish(fn, self, args){
      var result;
      try { result = fn.apply(self, args); }
      finally {
        setTimeout(function(){
          try { var b = bridge(); if (b && b.restoreSpeechFeedback) b.restoreSpeechFeedback(); } catch(e) {}
        }, 300);
      }
      return result;
    }
    if (typeof originalStop === 'function') proto.stop = function(){ return finish(originalStop, this, arguments); };
    if (typeof originalAbort === 'function') proto.abort = function(){ return finish(originalAbort, this, arguments); };
    proto.__finSpeechSilencePatched = true;
  }

  patch(window.SpeechRecognition);
  patch(window.webkitSpeechRecognition);
})();
