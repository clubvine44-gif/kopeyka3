function openExpenseForm(id) {
  const rec = id ? STATE.expenses.find(x => x.id === id) : null;
  let catOpts = EXP_CATS.map(c => {
    const sel = rec && rec.category === c.id ? ' selected' : '';
    return '<option value="' + c.id + '"' + sel + '>' + c.label + '</option>';
  }).join('');
  showModal(
    '<h2>' + (rec ? 'Расход' : 'Новый расход') + '</h2>' +
    '<div class="field modern"><label>Название</label><input id="fTitle" value="' + esc(rec ? rec.title : '') + '"></div>' +
    '<div class="field modern"><label>Сумма, ₽</label><input id="fAmt" type="number" inputmode="decimal" value="' + (rec ? Math.round(N(rec.amount) / 100) : '') + '"></div>' +
    '<div class="field modern"><label>Категория</label><select id="fCat">' + catOpts + '</select></div>' +
    '<div class="field modern"><label>Дата</label><input id="fDate" type="date" value="' + (rec ? rec.date : todayStr()) + '"></div>' +
    '<div class="field modern"><label>Комментарий</label><input id="fComment" value="' + esc(rec ? rec.comment : '') + '"></div>' +
    '<div class="modal-actions"><button class="btn btn-secondary" id="fCancel">Отмена</button><button class="btn btn-primary" id="fSave">Сохранить</button></div>' +
    (rec ? '<button class="btn btn-danger" style="margin-top:10px" id="fDel">Удалить</button>' : '')
  );
  document.getElementById('fCancel').onclick = closeModal;
  document.getElementById('fSave').onclick = () => {
    const title = document.getElementById('fTitle').value.trim() || 'Расход';
    const amount = Math.round(N(document.getElementById('fAmt').value) * 100);
    const category = document.getElementById('fCat').value || 'other';
    const date = document.getElementById('fDate').value || todayStr();
    const comment = document.getElementById('fComment').value.trim();
    if (rec) Object.assign(rec, {title, amount, category, date, comment});
    else STATE.expenses.push({id: uid(), title, amount, category, date, comment});
    saveState(); closeModal(); render(); toast('Сохранено');
  };
  if (rec) document.getElementById('fDel').onclick = () => {
    STATE.expenses = STATE.expenses.filter(x => x.id !== id);
    saveState(); closeModal(); render(); toast('Удалено');
  };
}

function openReserveForm(id) {
  const rec = id ? STATE.reserves.find(x => x.id === id) : null;
  const cats = [
    {id: 'cushion', title: 'Подушка безопасности', sub: 'на чёрный день'},
    {id: 'license', title: 'Права на машину', sub: 'обучение / права'},
    {id: 'custom', title: 'Другая цель', sub: 'своё название'}
  ];
  const curCat = rec ? (rec.category || 'custom') : 'cushion';
  let html = '<h2>' + (rec ? 'Резерв' : 'Новый резерв') + '</h2>';
  html += '<div class="field modern"><label>Категория</label><div class="reserve-cat-grid" id="rcats">';
  cats.forEach(c => {
    html += '<button type="button" class="reserve-cat-btn' + (curCat === c.id ? ' active' : '') +
      '" data-cat="' + c.id + '">' + c.title + '<span class="rc-sub">' + c.sub + '</span></button>';
  });
  html += '</div></div>';
  html += '<div class="field modern" id="fTitleWrap"' + (curCat === 'custom' ? '' : ' style="display:none"') +
    '><label>Название</label><input id="fTitle" value="' + esc(rec && rec.category === 'custom' ? rec.title : '') + '"></div>';
  html += '<div class="field modern"><label>Цель, ₽</label><input id="fTarget" type="number" inputmode="decimal" value="' +
    (rec && rec.target ? Math.round(N(rec.target) / 100) : '') + '"></div>';
  html += '<div class="field modern"><label>Метод</label><select id="fMethod">' +
    '<option value="fixed">Фикс. сумма в месяц</option>' +
    '<option value="percent">% от дохода</option>' +
    '<option value="target">К дате</option></select></div>';
  html += '<div class="field modern"><label>Фикс / % / дата</label><input id="fExtra" value="' +
    esc(rec ? (rec.method === 'target' ? (rec.targetDate || '') : (rec.method === 'percent' ? rec.percent : Math.round(N(rec.fixedAmount) / 100))) : '') +
    '"></div>';
  if (rec) html += '<div class="faint" style="margin-bottom:10px">Накоплено: ' + fmt(N(rec.saved)) + '</div>';
  html += '<div class="modal-actions"><button class="btn btn-secondary" id="fCancel">Отмена</button><button class="btn btn-primary" id="fSave">Сохранить</button></div>';
  if (rec) html += '<button class="btn btn-danger" style="margin-top:10px" id="fDel">Удалить</button>';
  showModal(html);
  if (rec) document.getElementById('fMethod').value = rec.method || 'fixed';
  let selectedCat = curCat;
  document.querySelectorAll('#rcats .reserve-cat-btn').forEach(btn => {
    btn.onclick = () => {
      selectedCat = btn.dataset.cat;
      document.querySelectorAll('#rcats .reserve-cat-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.getElementById('fTitleWrap').style.display = selectedCat === 'custom' ? '' : 'none';
    };
  });
  document.getElementById('fCancel').onclick = closeModal;
  document.getElementById('fSave').onclick = () => {
    const map = {cushion: 'Подушка безопасности', license: 'Права на машину'};
    let title = map[selectedCat] || 'Другая цель';
    if (selectedCat === 'custom') title = document.getElementById('fTitle').value.trim() || 'Другая цель';
    const target = Math.round(N(document.getElementById('fTarget').value) * 100);
    const method = document.getElementById('fMethod').value;
    const extra = document.getElementById('fExtra').value.trim();
    const obj = {
      id: rec ? rec.id : uid(), title, category: selectedCat, target, method,
      active: true, saved: rec ? N(rec.saved) : 0
    };
    if (method === 'percent') obj.percent = N(extra);
    else if (method === 'target') obj.targetDate = extra;
    else obj.fixedAmount = Math.round(N(extra) * 100);
    if (rec) Object.assign(rec, obj);
    else STATE.reserves.push(obj);
    saveState(); closeModal(); render(); toast('Сохранено');
  };
  if (rec) document.getElementById('fDel').onclick = () => {
    STATE.reserves = STATE.reserves.filter(x => x.id !== id);
    saveState(); closeModal(); render(); toast('Удалено');
  };
}

function openDebtForm(id) {
  const rec = id ? STATE.debts.find(x => x.id === id) : null;
  showModal(
    '<h2>' + (rec ? 'Долг' : 'Новый долг') + '</h2>' +
    '<div class="field modern"><label>Кому</label><input id="fTitle" value="' + esc(rec ? rec.name : '') + '"></div>' +
    '<div class="field modern"><label>Сумма, ₽</label><input id="fAmt" type="number" value="' + (rec ? Math.round(N(rec.amount) / 100) : '') + '"></div>' +
    '<div class="field modern"><label>Оплачено, ₽</label><input id="fPaid" type="number" value="' + (rec ? Math.round(N(rec.paid) / 100) : '0') + '"></div>' +
    '<div class="field modern"><label>Срок</label><input id="fDue" type="date" value="' + (rec ? (rec.dueDate || '') : '') + '"></div>' +
    '<p class="faint">Погашение не минусует кассу само. Добавь расход «Оплата долга», когда реально заплатил.</p>' +
    '<div class="modal-actions"><button class="btn btn-secondary" id="fCancel">Отмена</button><button class="btn btn-primary" id="fSave">Сохранить</button></div>' +
    (rec ? '<button class="btn btn-danger" style="margin-top:10px" id="fDel">Удалить</button>' : '')
  );
  document.getElementById('fCancel').onclick = closeModal;
  document.getElementById('fSave').onclick = () => {
    const name = document.getElementById('fTitle').value.trim() || 'Долг';
    const amount = Math.round(N(document.getElementById('fAmt').value) * 100);
    const paid = Math.round(N(document.getElementById('fPaid').value) * 100);
    const dueDate = document.getElementById('fDue').value || '';
    if (rec) Object.assign(rec, {name, amount, paid, dueDate});
    else STATE.debts.push({id: uid(), name, amount, paid, dueDate});
    saveState(); closeModal(); render(); toast('Сохранено');
  };
  if (rec) document.getElementById('fDel').onclick = () => {
    STATE.debts = STATE.debts.filter(x => x.id !== id);
    saveState(); closeModal(); render(); toast('Удалено');
  };
}

