/* Копейка 3 — clean finance PWA */
(function () {
  'use strict';

  const STORAGE_KEY = 'kopeyka3_state_v1';
  const ANCHOR = '2026-08-17';
  const CYCLE = ['day', 'day', 'night', 'night', 'off', 'off'];

  const EXP_CATS = [
    'Продукты', 'Связь', 'Проезд', 'Жильё', 'Здоровье',
    'Развлечения', 'Одежда', 'Кафе', 'Подписки', 'Прочее'
  ];

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function fmt(n) {
    n = Math.round(Number(n) || 0);
    return n.toLocaleString('ru-RU') + ' ₽';
  }

  function parseDate(s) {
    const [y, m, d] = (s || '').split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }

  function daysBetween(a, b) {
    const ms = parseDate(b) - parseDate(a);
    return Math.round(ms / 86400000);
  }

  function shiftForDate(dateStr, overrides) {
    if (overrides && overrides[dateStr]) return overrides[dateStr];
    const diff = daysBetween(ANCHOR, dateStr);
    const idx = ((diff % 6) + 6) % 6;
    return CYCLE[idx];
  }

  function defaultState() {
    return {
      version: 3,
      settings: {
        openingBalance: 0,
        cyclePattern: CYCLE.slice(),
        month: todayStr().slice(0, 7)
      },
      income: [],
      expenses: [],
      reserves: [],
      debts: [],
      reserveOps: [],
      shiftsOverride: {},
      updatedAt: new Date().toISOString()
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return normalize(JSON.parse(raw));
    } catch (e) {
      return defaultState();
    }
  }

  function saneNum(v, max) {
    var n = Number(v);
    if (!isFinite(n) || n !== n) return 0;
    n = Math.round(n);
    if (max != null && Math.abs(n) > max) return 0;
    return n;
  }

  function normalize(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== 'object') return base;
    const out = Object.assign({}, base, raw);
    out.settings = Object.assign({}, base.settings, raw.settings || {});
    ['income', 'expenses', 'reserves', 'debts', 'reserveOps'].forEach(k => {
      if (!Array.isArray(out[k])) out[k] = [];
    });
    if (!out.shiftsOverride || typeof out.shiftsOverride !== 'object') out.shiftsOverride = {};

    var MAX = 5000000;
    out.settings.openingBalance = saneNum(out.settings.openingBalance, MAX);

    out.income = (out.income || []).filter(function(i){ return i && i.id; }).map(function(i){
      return Object.assign({}, i, { amount: saneNum(i.amount, MAX) });
    });
    out.expenses = (out.expenses || []).filter(function(e){ return e && e.id; }).map(function(e){
      return Object.assign({}, e, { amount: saneNum(e.amount, MAX) });
    });
    out.reserves = (out.reserves || []).filter(function(r){ return r && r.id; }).map(function(r){
      return Object.assign({}, r, {
        saved: saneNum(r.saved, MAX),
        target: saneNum(r.target, MAX)
      });
    });
    out.debts = (out.debts || []).filter(function(d){ return d && d.id; }).map(function(d){
      return Object.assign({}, d, {
        total: saneNum(d.total, MAX),
        paid: saneNum(d.paid, MAX)
      });
    });
    out.reserveOps = (out.reserveOps || []).filter(function(o){ return o && o.id; }).map(function(o){
      return Object.assign({}, o, { amount: saneNum(o.amount, MAX) });
    });
    return out;
  }

  let STATE = loadState();

  function saveState() {
    STATE.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
    } catch (e) {}
    if (typeof window.kopeykaCloud === 'object' && window.kopeykaCloud.scheduleSave) {
      window.kopeykaCloud.scheduleSave();
    }
  }

  window.defaultState = defaultState;
  window.setAppState = function (s) {
    STATE = normalize(s);
    saveState();
    render();
  };
  window.saveState = saveState;
  window.STATE = STATE;

  function compute() {
    const open = Number(STATE.settings.openingBalance) || 0;
    let incomeSum = 0, expenseSum = 0, depSum = 0, wdSum = 0;

    STATE.income.forEach(i => { incomeSum += Number(i.amount) || 0; });
    STATE.expenses.forEach(e => { expenseSum += Number(e.amount) || 0; });

    STATE.reserveOps.forEach(op => {
      const a = Number(op.amount) || 0;
      if (op.type === 'deposit') depSum += a;
      else if (op.type === 'withdraw') wdSum += a;
    });

    let reservesTotal = 0;
    STATE.reserves.forEach(r => {
      reservesTotal += Number(r.saved) || 0;
    });
    if (depSum === 0 && wdSum === 0 && reservesTotal > 0) depSum = reservesTotal;

    const cash = open + incomeSum - expenseSum - depSum + wdSum;

    let debtLeft = 0;
    STATE.debts.forEach(d => {
      debtLeft += Math.max(0, (Number(d.total) || 0) - (Number(d.paid) || 0));
    });

    const available = cash - debtLeft;

    const t = todayStr();
    const month = t.slice(0, 7);
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const dayNum = Number(t.slice(8));
    const daysLeft = Math.max(1, lastDay - dayNum + 1);
    const daily = available > 0 ? Math.floor(available / daysLeft) : 0;

    return {
      cash, available, incomeSum, expenseSum, depSum, wdSum,
      debtLeft, reservesTotal, daily, daysLeft
    };
  }

  function toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 2200);
  }
  window.toast = toast;

  function closeModal() {
    const bg = document.getElementById('modalBg');
    bg.classList.remove('show');
    bg.innerHTML = '';
  }

  function openModal(html) {
    const bg = document.getElementById('modalBg');
    bg.innerHTML = '<div class="modal">' + html + '</div>';
    bg.classList.add('show');
    bg.onclick = (e) => { if (e.target === bg) closeModal(); };
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function render() {
    window.STATE = STATE;
    const c = compute();
    const t = todayStr();
    const month = STATE.settings.month || t.slice(0, 7);
    const shift = shiftForDate(t, STATE.shiftsOverride);
    const shiftLabel = { day: 'День', night: 'Ночь', off: 'Выходной' }[shift] || shift;

    const app = document.getElementById('app');
    if (!app) return;

    const [y, m] = month.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const startWeek = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m, 0).getDate();
    let calHtml = '<div class="cal">';
    ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].forEach(d => {
      calHtml += '<div class="cal-h">' + d + '</div>';
    });
    for (let i = 0; i < startWeek; i++) calHtml += '<div class="cal-d other"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = month + '-' + String(d).padStart(2, '0');
      const sh = shiftForDate(ds, STATE.shiftsOverride);
      const isToday = ds === t;
      calHtml += '<div class="cal-d ' + sh + (isToday ? ' today' : '') + '" data-date="' + ds + '">' +
        d + '<span class="dot"></span></div>';
    }
    calHtml += '</div>';

    let resHtml = '';
    if (STATE.reserves.length === 0) {
      resHtml = '<div class="empty">Резервов пока нет</div>';
    } else {
      resHtml = '<div class="list">';
      STATE.reserves.forEach(r => {
        const pct = r.target > 0 ? Math.min(100, Math.round((r.saved / r.target) * 100)) : 0;
        resHtml += '<div class="item" data-id="' + r.id + '" data-kind="reserve">' +
          '<div class="left"><b>' + esc(r.name || 'Резерв') + '</b>' +
          '<span class="muted">' + fmt(r.saved) + (r.target ? ' / ' + fmt(r.target) : '') + '</span>' +
          '<div class="progress"><i style="width:' + pct + '%"></i></div></div></div>';
      });
      resHtml += '</div>';
    }

    let debtHtml = '';
    if (STATE.debts.length === 0) {
      debtHtml = '<div class="empty">Долгов нет</div>';
    } else {
      debtHtml = '<div class="list">';
      STATE.debts.forEach(d => {
        const left = Math.max(0, (d.total || 0) - (d.paid || 0));
        debtHtml += '<div class="item" data-id="' + d.id + '" data-kind="debt">' +
          '<div class="left"><b>' + esc(d.name || 'Долг') + '</b>' +
          '<span class="muted">осталось ' + fmt(left) + '</span></div>' +
          '<div class="amt minus">' + fmt(left) + '</div></div>';
      });
      debtHtml += '</div>';
    }

    const ops = [];
    STATE.income.forEach(i => ops.push({ t: i.date || '', type: 'income', amount: i.amount, note: i.note || i.category || 'Доход', id: i.id }));
    STATE.expenses.forEach(e => ops.push({ t: e.date || '', type: 'expense', amount: e.amount, note: e.category || e.note || 'Расход', id: e.id }));
    ops.sort((a, b) => (b.t || '').localeCompare(a.t || ''));
    const recent = ops.slice(0, 8);
    let opsHtml = '';
    if (!recent.length) {
      opsHtml = '<div class="empty">Операций пока нет</div>';
    } else {
      opsHtml = '<div class="list">';
      recent.forEach(o => {
        opsHtml += '<div class="item" data-id="' + o.id + '" data-kind="' + o.type + '">' +
          '<div class="left"><b>' + esc(o.note) + '</b><span class="muted">' + (o.t || '') + '</span></div>' +
          '<div class="amt ' + (o.type === 'income' ? 'plus' : 'minus') + '">' +
          (o.type === 'income' ? '+' : '−') + fmt(o.amount) + '</div></div>';
      });
      opsHtml += '</div>';
    }

    app.innerHTML =
      '<div class="card">' +
        '<div class="row" style="margin-bottom:12px">' +
          '<div><div class="card-title">Сегодня · ' + shiftLabel + '</div>' +
          '<div class="big">' + fmt(c.daily) + '</div>' +
          '<div class="muted">можно потратить сегодня</div></div>' +
          '<span class="pill ' + shift + '">' + shiftLabel + '</span></div>' +
        '<div class="grid2">' +
          '<div class="stat"><b>' + fmt(c.cash) + '</b><span>Касса</span></div>' +
          '<div class="stat"><b>' + fmt(c.available) + '</b><span>Доступно</span></div>' +
        '</div>' +
        '<div class="grid2" style="margin-top:10px">' +
          '<div class="stat"><b style="color:var(--green)">' + fmt(c.incomeSum) + '</b><span>Доходы</span></div>' +
          '<div class="stat"><b style="color:var(--red)">' + fmt(c.expenseSum) + '</b><span>Расходы</span></div>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-title">Календарь · ' + month + '</div>' + calHtml +
      '</div>' +

      '<div class="card">' +
        '<div class="card-title">Резервы · ' + fmt(c.reservesTotal) + '</div>' + resHtml +
      '</div>' +

      '<div class="card">' +
        '<div class="card-title">Долги · ' + fmt(c.debtLeft) + '</div>' + debtHtml +
      '</div>' +

      '<div class="card">' +
        '<div class="card-title">Последние операции</div>' + opsHtml +
      '</div>';

    app.querySelectorAll('.cal-d[data-date]').forEach(el => {
      el.onclick = () => {
        const ds = el.dataset.date;
        const cur = shiftForDate(ds, STATE.shiftsOverride);
        const next = cur === 'day' ? 'night' : cur === 'night' ? 'off' : 'day';
        STATE.shiftsOverride[ds] = next;
        saveState();
        render();
        toast('Смена: ' + ({ day: 'День', night: 'Ночь', off: 'Выходной' }[next]));
      };
    });

    app.querySelectorAll('.item[data-id]').forEach(el => {
      el.onclick = () => {
        const id = el.dataset.id;
        const kind = el.dataset.kind;
        if (kind === 'income') showEditIncome(id);
        else if (kind === 'expense') showEditExpense(id);
        else if (kind === 'reserve') showReserveMenu(id);
        else if (kind === 'debt') showDebtMenu(id);
      };
    });
  }

  function showIncomeForm(edit) {
    const it = edit || { amount: '', note: '', date: todayStr(), toReserve: '' };
    const resOpts = STATE.reserves.map(r =>
      '<option value="' + r.id + '"' + (it.toReserve === r.id ? ' selected' : '') + '>' + esc(r.name) + '</option>'
    ).join('');
    openModal(
      '<h2>' + (edit ? 'Изменить доход' : 'Новый доход') + '</h2>' +
      '<div class="field"><label>Сумма</label><input type="number" inputmode="decimal" id="fAmt" value="' + (it.amount || '') + '" placeholder="0"></div>' +
      '<div class="field"><label>Комментарий</label><input type="text" id="fNote" value="' + esc(it.note || '') + '" placeholder="Зарплата, подработка..."></div>' +
      '<div class="field"><label>Дата</label><input type="date" id="fDate" value="' + (it.date || todayStr()) + '"></div>' +
      '<div class="field"><label>Отложить в резерв</label><select id="fRes"><option value="">Не откладывать</option>' + resOpts + '</select></div>' +
      '<div class="btns">' +
        (edit ? '<button class="btn danger" id="fDel">Удалить</button>' : '') +
        '<button class="btn ghost" id="fCancel">Отмена</button>' +
        '<button class="btn primary" id="fOk">Сохранить</button>' +
      '</div>'
    );
    document.getElementById('fCancel').onclick = closeModal;
    if (edit) {
      document.getElementById('fDel').onclick = () => {
        STATE.income = STATE.income.filter(x => x.id !== edit.id);
        saveState(); closeModal(); render(); toast('Удалено');
      };
    }
    document.getElementById('fOk').onclick = () => {
      const amount = Number(document.getElementById('fAmt').value) || 0;
      if (amount <= 0) return toast('Укажи сумму');
      const note = document.getElementById('fNote').value.trim();
      const date = document.getElementById('fDate').value || todayStr();
      const toReserve = document.getElementById('fRes').value;
      if (edit) {
        edit.amount = amount; edit.note = note; edit.date = date;
      } else {
        STATE.income.push({ id: uid(), amount, note, date, createdAt: new Date().toISOString() });
      }
      if (toReserve && amount > 0) {
        const r = STATE.reserves.find(x => x.id === toReserve);
        if (r) {
          r.saved = (Number(r.saved) || 0) + amount;
          STATE.reserveOps.push({ id: uid(), reserveId: toReserve, type: 'deposit', amount, date, note: 'Из дохода' });
        }
      }
      saveState(); closeModal(); render();
      toast(edit ? 'Сохранено' : 'Доход добавлен');
    };
  }

  function showEditIncome(id) {
    const it = STATE.income.find(x => x.id === id);
    if (it) showIncomeForm(it);
  }

  function showExpenseForm(edit) {
    const it = edit || { amount: '', category: 'Продукты', note: '', date: todayStr() };
    const cats = EXP_CATS.map(c =>
      '<option value="' + c + '"' + (it.category === c ? ' selected' : '') + '>' + c + '</option>'
    ).join('');
    openModal(
      '<h2>' + (edit ? 'Изменить расход' : 'Новый расход') + '</h2>' +
      '<div class="field"><label>Сумма</label><input type="number" inputmode="decimal" id="fAmt" value="' + (it.amount || '') + '" placeholder="0"></div>' +
      '<div class="field"><label>Категория</label><select id="fCat">' + cats + '</select></div>' +
      '<div class="field"><label>Комментарий</label><input type="text" id="fNote" value="' + esc(it.note || '') + '" placeholder="Необязательно"></div>' +
      '<div class="field"><label>Дата</label><input type="date" id="fDate" value="' + (it.date || todayStr()) + '"></div>' +
      '<div class="btns">' +
        (edit ? '<button class="btn danger" id="fDel">Удалить</button>' : '') +
        '<button class="btn ghost" id="fCancel">Отмена</button>' +
        '<button class="btn primary" id="fOk">Сохранить</button>' +
      '</div>'
    );
    document.getElementById('fCancel').onclick = closeModal;
    if (edit) {
      document.getElementById('fDel').onclick = () => {
        STATE.expenses = STATE.expenses.filter(x => x.id !== edit.id);
        saveState(); closeModal(); render(); toast('Удалено');
      };
    }
    document.getElementById('fOk').onclick = () => {
      const amount = Number(document.getElementById('fAmt').value) || 0;
      if (amount <= 0) return toast('Укажи сумму');
      const category = document.getElementById('fCat').value;
      const note = document.getElementById('fNote').value.trim();
      const date = document.getElementById('fDate').value || todayStr();
      if (edit) {
        edit.amount = amount; edit.category = category; edit.note = note; edit.date = date;
      } else {
        STATE.expenses.push({ id: uid(), amount, category, note, date, createdAt: new Date().toISOString() });
      }
      saveState(); closeModal(); render();
      toast(edit ? 'Сохранено' : 'Расход добавлен');
    };
  }

  function showEditExpense(id) {
    const it = STATE.expenses.find(x => x.id === id);
    if (it) showExpenseForm(it);
  }

  function showReserveForm(edit) {
    const it = edit || { name: '', target: '', saved: 0 };
    openModal(
      '<h2>' + (edit ? 'Резерв' : 'Новый резерв') + '</h2>' +
      '<div class="field"><label>Название</label><input type="text" id="fName" value="' + esc(it.name || '') + '" placeholder="Подушка, права, отпуск..."></div>' +
      '<div class="field"><label>Цель (необязательно)</label><input type="number" inputmode="decimal" id="fTarget" value="' + (it.target || '') + '" placeholder="0"></div>' +
      (!edit ? '<div class="field"><label>Уже накоплено</label><input type="number" inputmode="decimal" id="fSaved" value="0" placeholder="0"></div>' : '') +
      '<div class="btns">' +
        (edit ? '<button class="btn danger" id="fDel">Удалить</button>' : '') +
        '<button class="btn ghost" id="fCancel">Отмена</button>' +
        '<button class="btn primary" id="fOk">Сохранить</button>' +
      '</div>'
    );
    document.getElementById('fCancel').onclick = closeModal;
    if (edit) {
      document.getElementById('fDel').onclick = () => {
        STATE.reserves = STATE.reserves.filter(x => x.id !== edit.id);
        STATE.reserveOps = STATE.reserveOps.filter(x => x.reserveId !== edit.id);
        saveState(); closeModal(); render(); toast('Удалено');
      };
    }
    document.getElementById('fOk').onclick = () => {
      const name = document.getElementById('fName').value.trim() || 'Резерв';
      const target = Number(document.getElementById('fTarget').value) || 0;
      if (edit) {
        edit.name = name; edit.target = target;
      } else {
        const saved = Number(document.getElementById('fSaved').value) || 0;
        const id = uid();
        STATE.reserves.push({ id, name, target, saved, active: true });
        if (saved > 0) {
          STATE.reserveOps.push({ id: uid(), reserveId: id, type: 'deposit', amount: saved, date: todayStr(), note: 'Начальный вклад' });
        }
      }
      saveState(); closeModal(); render();
      toast(edit ? 'Сохранено' : 'Резерв создан');
    };
  }

  function showReserveMenu(id) {
    const r = STATE.reserves.find(x => x.id === id);
    if (!r) return;
    openModal(
      '<h2>' + esc(r.name) + '</h2>' +
      '<div class="muted" style="margin-bottom:12px">' + fmt(r.saved) + (r.target ? ' из ' + fmt(r.target) : '') + '</div>' +
      '<div class="btns" style="flex-direction:column">' +
        '<button class="btn primary" id="fDep">Пополнить</button>' +
        '<button class="btn ghost" id="fEdit">Изменить</button>' +
        '<button class="btn danger" id="fDel">Удалить</button>' +
        '<button class="btn ghost" id="fCancel">Закрыть</button>' +
      '</div>'
    );
    document.getElementById('fCancel').onclick = closeModal;
    document.getElementById('fEdit').onclick = () => { closeModal(); showReserveForm(r); };
    document.getElementById('fDel').onclick = () => {
      STATE.reserves = STATE.reserves.filter(x => x.id !== id);
      STATE.reserveOps = STATE.reserveOps.filter(x => x.reserveId !== id);
      saveState(); closeModal(); render(); toast('Удалено');
    };
    document.getElementById('fDep').onclick = () => {
      closeModal();
      openModal(
        '<h2>Пополнить · ' + esc(r.name) + '</h2>' +
        '<div class="field"><label>Сумма</label><input type="number" inputmode="decimal" id="fAmt" placeholder="0"></div>' +
        '<div class="btns"><button class="btn ghost" id="fCancel">Отмена</button><button class="btn primary" id="fOk">Ок</button></div>'
      );
      document.getElementById('fCancel').onclick = closeModal;
      document.getElementById('fOk').onclick = () => {
        const amount = Number(document.getElementById('fAmt').value) || 0;
        if (amount <= 0) return toast('Укажи сумму');
        r.saved = (Number(r.saved) || 0) + amount;
        STATE.reserveOps.push({ id: uid(), reserveId: id, type: 'deposit', amount, date: todayStr() });
        saveState(); closeModal(); render(); toast('Пополнено');
      };
    };
  }

  function showDebtForm(edit) {
    const it = edit || { name: '', total: '', paid: 0 };
    openModal(
      '<h2>' + (edit ? 'Долг' : 'Новый долг') + '</h2>' +
      '<div class="field"><label>Название</label><input type="text" id="fName" value="' + esc(it.name || '') + '" placeholder="Кредит, рассрочка..."></div>' +
      '<div class="field"><label>Сумма долга</label><input type="number" inputmode="decimal" id="fTotal" value="' + (it.total || '') + '" placeholder="0"></div>' +
      (!edit ? '' : '<div class="field"><label>Уже выплачено</label><input type="number" inputmode="decimal" id="fPaid" value="' + (it.paid || 0) + '"></div>') +
      '<div class="btns">' +
        (edit ? '<button class="btn danger" id="fDel">Удалить</button>' : '') +
        '<button class="btn ghost" id="fCancel">Отмена</button>' +
        '<button class="btn primary" id="fOk">Сохранить</button>' +
      '</div>'
    );
    document.getElementById('fCancel').onclick = closeModal;
    if (edit) {
      document.getElementById('fDel').onclick = () => {
        STATE.debts = STATE.debts.filter(x => x.id !== edit.id);
        saveState(); closeModal(); render(); toast('Удалено');
      };
    }
    document.getElementById('fOk').onclick = () => {
      const name = document.getElementById('fName').value.trim() || 'Долг';
      const total = Number(document.getElementById('fTotal').value) || 0;
      if (total <= 0) return toast('Укажи сумму');
      if (edit) {
        edit.name = name; edit.total = total;
        const paidEl = document.getElementById('fPaid');
        if (paidEl) edit.paid = Number(paidEl.value) || 0;
      } else {
        STATE.debts.push({ id: uid(), name, total, paid: 0 });
      }
      saveState(); closeModal(); render();
      toast(edit ? 'Сохранено' : 'Долг добавлен');
    };
  }

  function showDebtMenu(id) {
    const d = STATE.debts.find(x => x.id === id);
    if (!d) return;
    const left = Math.max(0, (d.total || 0) - (d.paid || 0));
    openModal(
      '<h2>' + esc(d.name) + '</h2>' +
      '<div class="muted" style="margin-bottom:12px">Осталось ' + fmt(left) + '</div>' +
      '<div class="btns" style="flex-direction:column">' +
        '<button class="btn primary" id="fPay">Внести платёж</button>' +
        '<button class="btn ghost" id="fEdit">Изменить</button>' +
        '<button class="btn danger" id="fDel">Удалить</button>' +
        '<button class="btn ghost" id="fCancel">Закрыть</button>' +
      '</div>'
    );
    document.getElementById('fCancel').onclick = closeModal;
    document.getElementById('fEdit').onclick = () => { closeModal(); showDebtForm(d); };
    document.getElementById('fDel').onclick = () => {
      STATE.debts = STATE.debts.filter(x => x.id !== id);
      saveState(); closeModal(); render(); toast('Удалено');
    };
    document.getElementById('fPay').onclick = () => {
      closeModal();
      openModal(
        '<h2>Платёж · ' + esc(d.name) + '</h2>' +
        '<div class="field"><label>Сумма</label><input type="number" inputmode="decimal" id="fAmt" placeholder="0"></div>' +
        '<div class="muted" style="margin-bottom:10px">Спишется с кассы как расход</div>' +
        '<div class="btns"><button class="btn ghost" id="fCancel">Отмена</button><button class="btn primary" id="fOk">Ок</button></div>'
      );
      document.getElementById('fCancel').onclick = closeModal;
      document.getElementById('fOk').onclick = () => {
        const amount = Number(document.getElementById('fAmt').value) || 0;
        if (amount <= 0) return toast('Укажи сумму');
        d.paid = (Number(d.paid) || 0) + amount;
        STATE.expenses.push({
          id: uid(), amount, category: 'Прочее', note: 'Платёж: ' + (d.name || 'долг'),
          date: todayStr(), createdAt: new Date().toISOString()
        });
        saveState(); closeModal(); render(); toast('Платёж учтён');
      };
    };
  }

  function setupUI() {
    const fab = document.getElementById('fab');
    const radial = document.getElementById('radial');
    fab.onclick = () => {
      const open = radial.classList.toggle('show');
      fab.classList.toggle('open', open);
    };
    radial.querySelectorAll('button').forEach(btn => {
      btn.onclick = () => {
        radial.classList.remove('show');
        fab.classList.remove('open');
        const act = btn.dataset.act;
        if (act === 'income') showIncomeForm();
        else if (act === 'expense') showExpenseForm();
        else if (act === 'reserve') showReserveForm();
        else if (act === 'debt') showDebtForm();
      };
    });

    document.getElementById('btnMonth').onclick = () => {
      const cur = STATE.settings.month || todayStr().slice(0, 7);
      openModal(
        '<h2>Настройки</h2>' +
        '<div class="field"><label>Показать месяц</label><input type="month" id="fMonth" value="' + cur + '"></div>' +
        '<div class="field"><label>Начальный остаток (перенос с прошлого месяца)</label><input type="number" inputmode="decimal" id="fOpen" value="' + (STATE.settings.openingBalance || 0) + '"></div>' +
        '<div class="btns"><button class="btn ghost" id="fCancel">Отмена</button><button class="btn primary" id="fOk">Сохранить</button></div>' +
        '<div class="btns" style="margin-top:10px"><button class="btn danger" id="fReset" style="flex:1">Очистить все данные</button></div>'
      );
      document.getElementById('fCancel').onclick = closeModal;
      document.getElementById('fOk').onclick = () => {
        STATE.settings.month = document.getElementById('fMonth').value || cur;
        STATE.settings.openingBalance = Number(document.getElementById('fOpen').value) || 0;
        saveState(); closeModal(); render(); toast('Сохранено');
      };
      document.getElementById('fReset').onclick = () => {
        if (!confirm('Удалить все доходы, расходы, резервы и долги?')) return;
        STATE = defaultState();
        STATE.settings.month = cur;
        saveState();
        if (window.kopeykaCloud && window.kopeykaCloud.save) window.kopeykaCloud.save();
        closeModal(); render(); toast('Всё очищено');
      };
    };
  }

  function boot() {
    try {
      var c = compute();
      if (Math.abs(c.cash) > 2000000 || Math.abs(c.incomeSum) > 2000000 || Math.abs(c.expenseSum) > 2000000) {
        console.warn('reset insane local state', c);
        STATE = defaultState();
        saveState();
        setTimeout(function(){ toast('Сброшены кривые данные'); }, 400);
      }
    } catch (e) {}
    setupUI();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
