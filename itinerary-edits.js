/* itinerary-edits.js
 * Lightweight client-side add/edit/delete layer for the static itinerary pages.
 * Persists user changes to localStorage so they survive page reloads on the
 * same browser. No server required.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'SpainTrip.itineraryEdits.v1';
  var pageKey = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  // ---------- Storage helpers ----------
  function loadStore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { edits: {}, customActivities: {} };
      var parsed = JSON.parse(raw);
      parsed.edits = parsed.edits || {};
      parsed.customActivities = parsed.customActivities || {};
      return parsed;
    } catch (e) {
      return { edits: {}, customActivities: {} };
    }
  }

  function saveStore(store) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      console.warn('Could not save itinerary edits', e);
    }
  }

  // ---------- Key generation ----------
  function slug(s) {
    return (s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  function dayKeyFor(dayEl) {
    var h = dayEl.querySelector('.day-header h3, .day-header h2');
    var text = h ? h.textContent.trim() : 'day';
    return pageKey + '::' + slug(text);
  }

  function activityKeyFor(dayK, activityEl, indexInDay) {
    var h = activityEl.querySelector('h3, h4, h5');
    var tag = activityEl.querySelector('.activity-tag');
    var text = (tag ? tag.textContent : '') + '|' + (h ? h.textContent : '');
    return dayK + '::' + slug(text) + '::' + indexInDay;
  }

  // ---------- Modal ----------
  function buildModal() {
    var overlay = document.createElement('div');
    overlay.className = 'edit-modal-overlay';
    overlay.innerHTML =
      '<div class="edit-modal" role="dialog" aria-modal="true">' +
      '  <h3 class="edit-modal-title">Edit Itinerary Item</h3>' +
      '  <form class="edit-modal-form">' +
      '    <label class="edit-field"><span>Time / Tag</span><input name="time" type="text" placeholder="e.g. 7:00 PM Dinner"></label>' +
      '    <label class="edit-field"><span>Title</span><input name="title" type="text" required></label>' +
      '    <label class="edit-field"><span>Notes</span><textarea name="notes" rows="4"></textarea></label>' +
      '    <label class="edit-field edit-field-checkbox"><input name="hidden" type="checkbox"><span>Hide this item from the itinerary</span></label>' +
      '    <div class="edit-modal-actions">' +
      '      <button type="button" class="edit-btn-secondary" data-action="cancel">Cancel</button>' +
      '      <button type="button" class="edit-btn-danger" data-action="delete">Delete</button>' +
      '      <button type="submit" class="edit-btn-primary">Save</button>' +
      '    </div>' +
      '  </form>' +
      '</div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  var modalOverlay = null;
  function openModal(opts) {
    if (!modalOverlay) modalOverlay = buildModal();
    var form = modalOverlay.querySelector('.edit-modal-form');
    var titleEl = modalOverlay.querySelector('.edit-modal-title');
    var deleteBtn = modalOverlay.querySelector('[data-action="delete"]');
    var hiddenField = modalOverlay.querySelector('.edit-field-checkbox');

    titleEl.textContent = opts.title || 'Edit Itinerary Item';
    form.time.value = opts.values.time || '';
    form.title.value = opts.values.title || '';
    form.notes.value = opts.values.notes || '';
    form.hidden.checked = !!opts.values.hidden;

    // Mode controls: custom-new (add), custom-edit, builtin-edit
    if (opts.mode === 'custom-new') {
      deleteBtn.style.display = 'none';
      hiddenField.style.display = 'none';
    } else if (opts.mode === 'custom-edit') {
      deleteBtn.style.display = '';
      hiddenField.style.display = 'none';
    } else {
      deleteBtn.style.display = '';
      hiddenField.style.display = '';
    }

    modalOverlay.style.display = 'flex';
    setTimeout(function () { form.title.focus(); }, 30);

    function close() { modalOverlay.style.display = 'none'; cleanup(); }
    function onSubmit(e) {
      e.preventDefault();
      opts.onSave({
        time: form.time.value.trim(),
        title: form.title.value.trim(),
        notes: form.notes.value.trim(),
        hidden: form.hidden.checked
      });
      close();
    }
    function onClick(e) {
      var act = e.target.getAttribute('data-action');
      if (act === 'cancel') close();
      if (act === 'delete') {
        if (confirm('Delete this itinerary item?')) {
          opts.onDelete && opts.onDelete();
          close();
        }
      }
      if (e.target === modalOverlay) close();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    function cleanup() {
      form.removeEventListener('submit', onSubmit);
      modalOverlay.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    }
    form.addEventListener('submit', onSubmit);
    modalOverlay.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
  }

  // ---------- Apply edits to built-in activities ----------
  function extractActivityValues(el) {
    var tag = el.querySelector('.activity-tag');
    var h = el.querySelector('h3, h4, h5');
    var notesEl = el.querySelector('.user-note');
    return {
      time: tag ? tag.textContent.trim() : '',
      title: h ? h.textContent.trim() : '',
      notes: notesEl ? notesEl.getAttribute('data-note') || notesEl.textContent.trim() : '',
      hidden: el.classList.contains('itinerary-hidden')
    };
  }

  function applyEditToActivity(el, edit) {
    if (!edit) return;
    if (typeof edit.title === 'string' && edit.title) {
      var h = el.querySelector('h3, h4, h5');
      if (h) h.textContent = edit.title;
    }
    if (typeof edit.time === 'string') {
      var tag = el.querySelector('.activity-tag');
      if (tag && edit.time) tag.textContent = edit.time;
    }
    // Remove previous user-note
    var existing = el.querySelector('.user-note');
    if (existing) existing.remove();
    if (edit.notes) {
      var p = document.createElement('p');
      p.className = 'user-note';
      p.setAttribute('data-note', edit.notes);
      p.textContent = '📝 ' + edit.notes;
      el.appendChild(p);
    }
    if (edit.hidden) el.classList.add('itinerary-hidden');
    else el.classList.remove('itinerary-hidden');
  }

  // ---------- Build custom activity DOM ----------
  function buildCustomActivityEl(dayK, custom) {
    var el = document.createElement('div');
    el.className = 'activity custom-activity';
    el.setAttribute('data-custom-id', custom.id);
    el.innerHTML =
      '<div class="activity-tag tag-info">' + escapeHtml(custom.time || 'Custom') + '</div>' +
      '<h4></h4>' +
      (custom.notes ? '<p></p>' : '') +
      '<div class="custom-actions">' +
      '  <button type="button" class="edit-activity-btn" data-action="edit-custom">✎ Edit</button>' +
      '</div>';
    el.querySelector('h4').textContent = custom.title || 'Untitled';
    if (custom.notes) el.querySelector('p').textContent = custom.notes;
    return el;
  }

  function escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- Main init ----------
  function init() {
    var store = loadStore();
    var days = document.querySelectorAll('.day');
    if (!days.length) return;

    // Floating toolbar
    var toolbar = document.createElement('div');
    toolbar.className = 'itinerary-edit-toolbar';
    toolbar.innerHTML =
      '<button type="button" class="itinerary-edit-toggle" aria-pressed="false">✎ Edit Itinerary</button>' +
      '<button type="button" class="itinerary-edit-reset" title="Reset all edits on this page">↺ Reset</button>';
    document.body.appendChild(toolbar);

    var toggleBtn = toolbar.querySelector('.itinerary-edit-toggle');
    var resetBtn = toolbar.querySelector('.itinerary-edit-reset');

    function setEditMode(on) {
      document.body.classList.toggle('itinerary-editing', on);
      toggleBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      toggleBtn.textContent = on ? '✓ Done Editing' : '✎ Edit Itinerary';
    }
    toggleBtn.addEventListener('click', function () {
      setEditMode(!document.body.classList.contains('itinerary-editing'));
    });
    resetBtn.addEventListener('click', function () {
      if (!confirm('Reset all custom edits and additions on this page?')) return;
      // Clear keys that start with pageKey
      var s = loadStore();
      Object.keys(s.edits).forEach(function (k) {
        if (k.indexOf(pageKey + '::') === 0) delete s.edits[k];
      });
      Object.keys(s.customActivities).forEach(function (k) {
        if (k.indexOf(pageKey + '::') === 0) delete s.customActivities[k];
      });
      saveStore(s);
      location.reload();
    });

    days.forEach(function (dayEl) {
      var dayK = dayKeyFor(dayEl);

      // Apply edits to built-in activities
      var activities = dayEl.querySelectorAll(':scope > .activity');
      activities.forEach(function (actEl, i) {
        var actK = activityKeyFor(dayK, actEl, i);
        actEl.setAttribute('data-activity-key', actK);
        var edit = store.edits[actK];
        if (edit) applyEditToActivity(actEl, edit);

        // Add edit button
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'edit-activity-btn';
        btn.textContent = '✎ Edit';
        btn.addEventListener('click', function () {
          var s = loadStore();
          var current = s.edits[actK] || extractActivityValues(actEl);
          // For built-in, original is in the DOM if not edited
          if (!s.edits[actK]) current = extractActivityValues(actEl);
          openModal({
            title: 'Edit Itinerary Item',
            mode: 'builtin-edit',
            values: current,
            onSave: function (vals) {
              s = loadStore();
              s.edits[actK] = vals;
              saveStore(s);
              applyEditToActivity(actEl, vals);
            },
            onDelete: function () {
              s = loadStore();
              s.edits[actK] = Object.assign({}, s.edits[actK] || extractActivityValues(actEl), { hidden: true });
              saveStore(s);
              applyEditToActivity(actEl, s.edits[actK]);
            }
          });
        });
        actEl.appendChild(btn);
      });

      // Render custom activities
      var customs = store.customActivities[dayK] || [];
      customs.forEach(function (custom) {
        var el = buildCustomActivityEl(dayK, custom);
        dayEl.appendChild(el);
        wireCustomActivity(el, dayK, custom.id);
      });

      // Add "+ Add Stop" button at end of day
      var addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'add-stop-btn';
      addBtn.textContent = '＋ Add Custom Stop';
      addBtn.addEventListener('click', function () {
        openModal({
          title: 'Add Custom Stop',
          mode: 'custom-new',
          values: { time: '', title: '', notes: '', hidden: false },
          onSave: function (vals) {
            if (!vals.title) return;
            var s = loadStore();
            var arr = s.customActivities[dayK] || [];
            var newItem = {
              id: 'c_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
              time: vals.time,
              title: vals.title,
              notes: vals.notes
            };
            arr.push(newItem);
            s.customActivities[dayK] = arr;
            saveStore(s);
            var el = buildCustomActivityEl(dayK, newItem);
            dayEl.insertBefore(el, addBtn);
            wireCustomActivity(el, dayK, newItem.id);
          }
        });
      });
      dayEl.appendChild(addBtn);
    });

    function wireCustomActivity(el, dayK, customId) {
      var editBtn = el.querySelector('[data-action="edit-custom"]');
      if (!editBtn) return;
      editBtn.addEventListener('click', function () {
        var s = loadStore();
        var arr = s.customActivities[dayK] || [];
        var item = arr.filter(function (x) { return x.id === customId; })[0];
        if (!item) return;
        openModal({
          title: 'Edit Custom Stop',
          mode: 'custom-edit',
          values: { time: item.time, title: item.title, notes: item.notes, hidden: false },
          onSave: function (vals) {
            var s2 = loadStore();
            var arr2 = s2.customActivities[dayK] || [];
            for (var i = 0; i < arr2.length; i++) {
              if (arr2[i].id === customId) {
                arr2[i].time = vals.time;
                arr2[i].title = vals.title;
                arr2[i].notes = vals.notes;
              }
            }
            s2.customActivities[dayK] = arr2;
            saveStore(s2);
            // Rebuild this element's contents
            var tag = el.querySelector('.activity-tag');
            var h = el.querySelector('h4');
            tag.textContent = vals.time || 'Custom';
            h.textContent = vals.title;
            var p = el.querySelector('p');
            if (vals.notes) {
              if (!p) {
                p = document.createElement('p');
                el.insertBefore(p, el.querySelector('.custom-actions'));
              }
              p.textContent = vals.notes;
            } else if (p) {
              p.remove();
            }
          },
          onDelete: function () {
            var s2 = loadStore();
            var arr2 = s2.customActivities[dayK] || [];
            s2.customActivities[dayK] = arr2.filter(function (x) { return x.id !== customId; });
            saveStore(s2);
            el.remove();
          }
        });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
