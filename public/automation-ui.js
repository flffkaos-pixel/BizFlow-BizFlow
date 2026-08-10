/**
 * BizFlow Automation UI
 * 노코드 워크플로 빌더 + 실행 로그 뷰어
 * public/automation-ui.js
 */

const AUTOMATION_UI = (() => {
  let currentWorkflow = null;
  let draggedAction = null;

  // ──────────────────────────────────────────────
  // 메인 렌더: 자동화 대시보드
  // ──────────────────────────────────────────────
  function renderAutomationDashboard() {
    const workflows = AUTOMATION.getWorkflows();
    const logs = AUTOMATION.getExecutionLogs(20);

    return `
    <div class="automation-dashboard">
      <div class="auto-header">
        <h2>${t('automation_title')}</h2>
        <div class="auto-stats">
          <span class="stat">${workflows.filter(w => w.enabled).length}/${workflows.length} ${t('active')}</span>
          <span class="stat">${logs.filter(l => l.status === 'success').length} ${t('success_today')}</span>
          <span class="stat warn">${logs.filter(l => l.status === 'failed').length} ${t('failed_today')}</span>
        </div>
        <button class="btn-primary" id="btn-new-workflow">${t('new_workflow')}</button>
      </div>

      <div class="auto-tabs">
        <button class="tab-btn active" data-tab="workflows">${t('workflows')}</button>
        <button class="tab-btn" data-tab="templates">${t('templates')}</button>
        <button class="tab-btn" data-tab="logs">${t('execution_logs')}</button>
      </div>

      <div class="auto-panels">
        <div class="panel active" id="panel-workflows">${renderWorkflowList(workflows)}</div>
        <div class="panel" id="panel-templates">${renderTemplateGallery()}</div>
        <div class="panel" id="panel-logs">${renderExecutionLogs(logs)}</div>
      </div>
    </div>
    ${renderWorkflowModal()}
    ${renderLogDetailModal()}
    `;
  }

  function renderWorkflowList(workflows) {
    if (!workflows.length) {
      return `<div class="empty-state"><p>${t('no_workflows')}</p><button class="btn-primary" id="btn-first-workflow">${t('create_first')}</button></div>`;
    }
    return `
    <div class="workflow-list">
      ${workflows.map(w => `
        <div class="workflow-card ${w.enabled ? '' : 'disabled'}" data-id="${w.id}">
          <div class="wf-header">
            <div>
              <h4>${esc(w.name)}</h4>
              <p class="wf-desc">${esc(w.description || '')}</p>
            </div>
            <div class="wf-meta">
              <span class="trigger-badge">${getTriggerLabel(w.trigger)}</span>
              <span class="status-badge ${w.enabled ? 'active' : 'inactive'}">${w.enabled ? t('enabled') : t('disabled')}</span>
            </div>
          </div>
          <div class="wf-summary">
            ${w.conditions?.length ? `<span class="chip">${w.conditions.length} ${t('conditions')}</span>` : ''}
            <span class="chip">${w.actions?.length || 0} ${t('actions')}</span>
            ${w.cron ? `<span class="chip cron">${w.cron}</span>` : ''}
          </div>
          <div class="wf-stats">
            <span>성공: <strong>${w.successCount || 0}</strong></span>
            <span>실패: <strong>${w.failureCount || 0}</strong></span>
            <span>마지막: <strong>${w.lastRunAt ? fmtDate(w.lastRunAt) : '-'}</strong></span>
          </div>
          <div class="wf-actions">
            <button class="btn-icon btn-edit" data-edit="${w.id}" title="${t('edit')}">${icon('edit')}</button>
            <button class="btn-icon btn-toggle" data-toggle="${w.id}" title="${w.enabled ? t('disable') : t('enable')}">${w.enabled ? icon('pause') : icon('play')}</button>
            <button class="btn-icon btn-duplicate" data-duplicate="${w.id}" title="${t('duplicate')}">${icon('copy')}</button>
            <button class="btn-icon btn-delete" data-delete="${w.id}" title="${t('delete')}" style="color:var(--red-500)">${icon('trash')}</button>
          </div>
        </div>
      `).join('')}
    </div>
    `;
  }

  function renderTemplateGallery() {
    const all = AUTOMATION_ALL_TEMPLATES || [];
    const byIndustry = {};
    all.forEach(t => {
      // 템플릿에 industry 속성이 없으므로 이름/설명으로 분류하거나 별도 매핑 필요
      // 여기서는 전체 나열
    });

    return `
    <div class="template-gallery">
      <div class="template-filters">
        <button class="filter-btn active" data-industry="all">${t('all_industries')}</button>
        <button class="filter-btn" data-industry="common">${t('common')}</button>
        <button class="filter-btn" data-industry="cafe_individual">${t('cafe_individual')}</button>
        <button class="filter-btn" data-industry="restaurant_individual">${t('restaurant_individual')}</button>
        <button class="filter-btn" data-industry="cafe_franchise">${t('cafe_franchise')}</button>
        <button class="filter-btn" data-industry="restaurant_franchise">${t('restaurant_franchise')}</button>
        <button class="filter-btn" data-industry="hospital">${t('hospital')}</button>
        <button class="filter-btn" data-industry="realestate">${t('realestate')}</button>
        <button class="filter-btn" data-industry="academy">${t('academy')}</button>
        <button class="filter-btn" data-industry="manufacturing">${t('manufacturing')}</button>
        <button class="filter-btn" data-industry="beauty">${t('beauty')}</button>
      </div>
      <div class="template-grid" id="template-grid">
        ${all.map((tpl, idx) => renderTemplateCard(tpl, idx)).join('')}
      </div>
    </div>
    `;
  }

  function renderTemplateCard(tpl, idx) {
    return `
    <div class="template-card" data-idx="${idx}">
      <div class="tpl-header">
        <h4>${esc(tpl.name)}</h4>
        <span class="trigger-badge">${getTriggerLabel(tpl.trigger)}</span>
      </div>
      <p class="tpl-desc">${esc(tpl.description)}</p>
      <div class="tpl-preview">
        ${(tpl.actions || []).slice(0, 4).map(a => `<span class="action-chip">${getActionLabel(a.type)}</span>`).join('')}
        ${(tpl.actions || []).length > 4 ? `<span class="action-chip more">+${(tpl.actions || []).length - 4}</span>` : ''}
      </div>
      <button class="btn-secondary btn-use-template" data-idx="${idx}">${t('use_template')}</button>
    </div>
    `;
  }

  function renderExecutionLogs(logs) {
    if (!logs.length) return `<div class="empty-state"><p>${t('no_logs')}</p></div>`;
    return `
    <div class="log-table-wrap">
      <table class="log-table">
        <thead><tr><th>${t('time')}</th><th>${t('workflow')}</th><th>${t('trigger')}</th><th>${t('status')}</th><th>${t('duration')}</th><th>${t('actions')}</th><th></th></tr></thead>
        <tbody>
          ${logs.map(log => `
            <tr class="${log.status}" data-id="${log.id}">
              <td>${fmtDate(log.startedAt)}</td>
              <td>${esc(log.workflowName)}</td>
              <td>${getTriggerLabel(log.trigger)}</td>
              <td><span class="status-tag ${log.status}">${log.status === 'success' ? t('success') : log.status === 'failed' ? t('failed') : t('skipped')}</span></td>
              <td>${log.completedAt ? ((new Date(log.completedAt) - new Date(log.startedAt)) / 1000).toFixed(1) + 's' : '-'}</td>
              <td>${log.steps?.length || 0}</td>
              <td><button class="btn-icon btn-log-detail" data-detail="${log.id}" title="${t('detail')}">${icon('search')}</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    `;
  }

  // ──────────────────────────────────────────────
  // 모달: 워크플로 에디터 (빌더)
  // ──────────────────────────────────────────────
  function renderWorkflowModal() {
    return `
    <div class="modal-overlay" id="wf-modal" style="display:none;">
      <div class="modal modal-xl wf-builder">
        <div class="wf-builder-header">
          <h3 id="wf-modal-title">${t('new_workflow')}</h3>
          <button class="btn-icon" id="wf-close">${icon('close')}</button>
        </div>
        <div class="wf-builder-body">
          <!-- 좌: 캔버스 -->
          <div class="wf-canvas-wrap">
            <div class="wf-toolbar">
              <h4>${t('trigger')}</h4>
              <select id="wf-trigger" class="select-sm">${renderTriggerOptions()}</select>
              <div class="divider"></div>
              <h4>${t('conditions')}</h4>
              <div id="wf-conditions" class="condition-list"></div>
              <button class="btn-sm btn-add-condition" id="btn-add-condition">+ ${t('add_condition')}</button>
              <div class="divider"></div>
              <h4>${t('actions')}</h4>
              <div id="wf-actions" class="action-canvas"></div>
              <button class="btn-sm btn-add-action" id="btn-add-action">+ ${t('add_action')}</button>
            </div>
          </div>
          <!-- 우: 속성 패널 -->
          <div class="wf-properties" id="wf-properties">
            <h4>${t('workflow_settings')}</h4>
            <div class="field"><label>${t('name')}</label><input type="text" id="wf-name" placeholder="${t('workflow_name_placeholder')}"></div>
            <div class="field"><label>${t('description')}</label><textarea id="wf-desc" rows="2" placeholder="${t('description_placeholder')}"></textarea></div>
            <div class="field"><label>${t('enabled')}</label><label class="toggle"><input type="checkbox" id="wf-enabled" checked><span></span></label></div>
            <div id="wf-cron-field" class="field" style="display:none;"><label>${t('cron_expression')}</label><input type="text" id="wf-cron" placeholder="0 9 * * *"><small>${t('cron_help')}</small></div>
            <hr>
            <h4>${t('action_properties')}</h4>
            <div id="wf-action-props">${t('select_action')}</div>
          </div>
        </div>
        <div class="wf-builder-footer">
          <button class="btn-secondary" id="wf-cancel">${t('cancel')}</button>
          <button class="btn-primary" id="wf-save">${t('save')}</button>
        </div>
      </div>
    </div>
    `;
  }

  function renderTriggerOptions() {
    const triggers = Object.entries(TriggerType).map(([k, v]) => `<option value="${v}">${getTriggerLabel(v)}</option>`).join('');
    return triggers;
  }

  function renderActionOptions() {
    const actions = Object.entries(ActionType).map(([k, v]) => `<option value="${v}">${getActionLabel(v)}</option>`).join('');
    return actions;
  }

  // ──────────────────────────────────────────────
  // 모달: 실행 로그 상세
  // ──────────────────────────────────────────────
  function renderLogDetailModal() {
    return `
    <div class="modal-overlay" id="log-modal" style="display:none;">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>${t('execution_detail')}</h3>
          <button class="btn-icon" id="log-close">${icon('close')}</button>
        </div>
        <div class="modal-body" id="log-detail-body"></div>
      </div>
    </div>
    `;
  }

  // ──────────────────────────────────────────────
  // 바인딩
  // ──────────────────────────────────────────────
  function bindAutomation() {
    // 탭
    document.querySelectorAll('.auto-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.auto-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.auto-panels .panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
      });
    });

    // 새 워크플로
    document.getElementById('btn-new-workflow')?.addEventListener('click', () => openWorkflowModal());
    document.getElementById('btn-first-workflow')?.addEventListener('click', () => openWorkflowModal());

    // 워크플로 카드 액션
    document.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', e => openWorkflowModal(e.target.dataset.edit)));
    document.querySelectorAll('.btn-toggle').forEach(b => b.addEventListener('click', e => {
      const id = e.target.dataset.toggle;
      const wf = AUTOMATION.getWorkflows().find(w => w.id === id);
      AUTOMATION.toggleWorkflow(id, !wf.enabled);
      refreshPanel('workflows');
    }));
    document.querySelectorAll('.btn-duplicate').forEach(b => b.addEventListener('click', e => {
      const id = e.target.dataset.duplicate;
      const wf = AUTOMATION.getWorkflows().find(w => w.id === id);
      const newWf = { ...wf, id: `wf_${Date.now()}`, name: wf.name + ' (복사)', enabled: false, createdAt: new Date().toISOString() };
      const workflows = AUTOMATION.getWorkflows();
      workflows.push(newWf);
      AUTOMATION.saveWorkflows(workflows);
      refreshPanel('workflows');
    }));
    document.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', e => {
      if (confirm(t('delete_confirm'))) AUTOMATION.deleteWorkflow(e.target.dataset.delete), refreshPanel('workflows');
    }));

    // 템플릿 필터
    document.querySelectorAll('.filter-btn').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      filterTemplates(b.dataset.industry);
    }));
    document.querySelectorAll('.btn-use-template').forEach(b => b.addEventListener('click', e => {
      const idx = parseInt(e.target.dataset.idx);
      useTemplate(idx);
    }));

    // 로그 상세
    document.querySelectorAll('.btn-log-detail').forEach(b => b.addEventListener('click', e => showLogDetail(e.target.dataset.detail)));

    // 모달 닫기
    document.getElementById('wf-close')?.addEventListener('click', closeWorkflowModal);
    document.getElementById('wf-cancel')?.addEventListener('click', closeWorkflowModal);
    document.getElementById('log-close')?.addEventListener('click', closeLogModal);
    document.getElementById('wf-modal')?.addEventListener('click', e => { if (e.target.id === 'wf-modal') closeWorkflowModal(); });
    document.getElementById('log-modal')?.addEventListener('click', e => { if (e.target.id === 'log-modal') closeLogModal(); });

    // 워크플로 저장
    document.getElementById('wf-save')?.addEventListener('click', saveWorkflow);

    // 트리거 변경 시 크론 필드 토글
    document.getElementById('wf-trigger')?.addEventListener('change', e => {
      document.getElementById('wf-cron-field').style.display = e.target.value === TriggerType.SCHEDULED_TIME ? 'block' : 'none';
    });

    // 조건/액션 추가
    document.getElementById('btn-add-condition')?.addEventListener('click', () => addConditionRow());
    document.getElementById('btn-add-action')?.addEventListener('click', () => addActionRow());

    // 데모 버튼 주입
    if (window.DEMO_SEEDER) DEMO_SEEDER.injectDemoButton();
  }

  // ──────────────────────────────────────────────
  // 워크플로 모달 열기/닫기
  // ──────────────────────────────────────────────
  function openWorkflowModal(id = null) {
    currentWorkflow = id ? AUTOMATION.getWorkflows().find(w => w.id === id) : null;
    const modal = document.getElementById('wf-modal');
    modal.style.display = 'flex';

    if (currentWorkflow) {
      document.getElementById('wf-modal-title').textContent = t('edit_workflow');
      document.getElementById('wf-name').value = currentWorkflow.name;
      document.getElementById('wf-desc').value = currentWorkflow.description || '';
      document.getElementById('wf-enabled').checked = currentWorkflow.enabled;
      document.getElementById('wf-trigger').value = currentWorkflow.trigger;
      document.getElementById('wf-cron-field').style.display = currentWorkflow.trigger === TriggerType.SCHEDULED_TIME ? 'block' : 'none';
      document.getElementById('wf-cron').value = currentWorkflow.cron || '';
      renderConditions(currentWorkflow.conditions || []);
      renderActions(currentWorkflow.actions || []);
    } else {
      document.getElementById('wf-modal-title').textContent = t('new_workflow');
      document.getElementById('wf-name').value = '';
      document.getElementById('wf-desc').value = '';
      document.getElementById('wf-enabled').checked = true;
      document.getElementById('wf-trigger').value = TriggerType.DEAL_STAGE_CHANGED;
      document.getElementById('wf-cron-field').style.display = 'none';
      document.getElementById('wf-cron').value = '';
      renderConditions([]);
      renderActions([]);
    }
  }

  function closeWorkflowModal() {
    document.getElementById('wf-modal').style.display = 'none';
    currentWorkflow = null;
  }

  function closeLogModal() {
    document.getElementById('log-modal').style.display = 'none';
  }

  // ──────────────────────────────────────────────
  // 조건/액션 렌더링 (빌더 내부)
  // ──────────────────────────────────────────────
  function renderConditions(conditions) {
    const container = document.getElementById('wf-conditions');
    container.innerHTML = conditions.map((c, i) => `
      <div class="condition-row" data-idx="${i}">
        <select class="cond-field">${renderFieldOptions(c.field)}</select>
        <select class="cond-op">${renderOperatorOptions(c.operator)}</select>
        <input type="text" class="cond-value" value="${esc(c.value)}" placeholder="${t('value')}">
        <button class="btn-icon btn-remove-condition" data-idx="${i}" title="${t('remove')}">${icon('trash')}</button>
      </div>
    `).join('') || `<p class="text-muted">${t('no_conditions')}</p>`;

    container.querySelectorAll('.btn-remove-condition').forEach(b => b.addEventListener('click', e => {
      const idx = parseInt(e.target.closest('.condition-row').dataset.idx);
      removeCondition(idx);
    }));
    container.querySelectorAll('.cond-field, .cond-op, .cond-value').forEach(el => el.addEventListener('change', () => updateConditionsFromUI()));
  }

  function renderFieldOptions(selected) {
    const fields = [
      'deal.id', 'deal.title', 'deal.stage', 'deal.value', 'deal.source', 'deal.assignedTo',
      'contact.id', 'contact.name', 'contact.email', 'contact.phone',
      'payload.*', 'triggerType', 'timestamp',
      'deal.clientName', 'deal.contactEmail', 'deal.contactPhone', 'deal.metadata.*'
    ];
    return fields.map(f => `<option value="${f}" ${f === selected ? 'selected' : ''}>${f}</option>`).join('');
  }

  function renderOperatorOptions(selected) {
    return Object.entries(ConditionType).map(([k, v]) => `<option value="${v}" ${v === selected ? 'selected' : ''}>${getOperatorLabel(v)}</option>`).join('');
  }

  function addConditionRow() {
    const container = document.getElementById('wf-conditions');
    const idx = container.querySelectorAll('.condition-row').length;
    const row = document.createElement('div');
    row.className = 'condition-row';
    row.dataset.idx = idx;
    row.innerHTML = `
      <select class="cond-field">${renderFieldOptions('')}</select>
      <select class="cond-op">${renderOperatorOptions(ConditionType.EQUALS)}</select>
      <input type="text" class="cond-value" placeholder="${t('value')}">
      <button class="btn-icon btn-remove-condition" data-idx="${idx}" title="${t('remove')}">${icon('trash')}</button>
    `;
    container.appendChild(row);
    row.querySelector('.btn-remove-condition').addEventListener('click', e => removeCondition(parseInt(e.target.closest('.condition-row').dataset.idx)));
    row.querySelectorAll('select, input').forEach(el => el.addEventListener('change', () => updateConditionsFromUI()));
  }

  function removeCondition(idx) {
    const rows = document.querySelectorAll('.condition-row');
    rows[idx]?.remove();
    Array.from(rows).forEach((r, i) => r.dataset.idx = i);
    updateConditionsFromUI();
  }

  function updateConditionsFromUI() {
    const conditions = [];
    document.querySelectorAll('.condition-row').forEach(row => {
      conditions.push({
        field: row.querySelector('.cond-field').value,
        operator: row.querySelector('.cond-op').value,
        value: row.querySelector('.cond-value').value,
      });
    });
    if (currentWorkflow) currentWorkflow.conditions = conditions;
  }

  function renderActions(actions) {
    const canvas = document.getElementById('wf-actions');
    canvas.innerHTML = actions.map((a, i) => `
      <div class="action-node ${a.type === ActionType.DELAY ? 'delay' : ''}" data-idx="${i}" draggable="true">
        <span class="action-handle">${icon('grip')}</span>
        <span class="action-icon">${getActionIcon(a.type)}</span>
        <span class="action-label">${getActionLabel(a.type)}</span>
        <button class="btn-icon btn-action-config" data-idx="${i}" title="${t('configure')}">${icon('settings')}</button>
        <button class="btn-icon btn-action-delete" data-idx="${i}" title="${t('delete')}">${icon('trash')}</button>
      </div>
    `).join('') || `<p class="text-muted" style="text-align:center;padding:20px;">${t('no_actions')}</p>`;

    // 드래그앤드랍
    canvas.querySelectorAll('.action-node').forEach(node => {
      node.addEventListener('dragstart', e => { draggedAction = node; node.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
      node.addEventListener('dragend', () => { node.classList.remove('dragging'); draggedAction = null; });
      node.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; const after = getDragAfterElement(canvas, e.clientY); if (after) canvas.insertBefore(draggedAction, after); else canvas.appendChild(draggedAction); });
      node.addEventListener('drop', () => reorderActionsFromUI());
    });

    canvas.querySelectorAll('.btn-action-config').forEach(b => b.addEventListener('click', e => openActionConfig(parseInt(e.target.dataset.idx))));
    canvas.querySelectorAll('.btn-action-delete').forEach(b => b.addEventListener('click', e => removeAction(parseInt(e.target.dataset.idx))));
  }

  function getDragAfterElement(container, y) {
    const nodes = [...container.querySelectorAll('.action-node:not(.dragging)')];
    return nodes.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  function reorderActionsFromUI() {
    const actions = [];
    document.querySelectorAll('.action-node').forEach((node, i) => {
      node.dataset.idx = i;
      const idx = parseInt(node.dataset.idx);
      if (currentWorkflow?.actions[idx]) actions.push(currentWorkflow.actions[idx]);
    });
    if (currentWorkflow) currentWorkflow.actions = actions;
    // 인덱스 다시 매기기
    document.querySelectorAll('.action-node').forEach((node, i) => {
      node.dataset.idx = i;
      node.querySelector('.btn-action-config').dataset.idx = i;
      node.querySelector('.btn-action-delete').dataset.idx = i;
    });
  }

  function addActionRow() {
    if (!currentWorkflow) currentWorkflow = { actions: [] };
    currentWorkflow.actions.push({ type: ActionType.SEND_NOTIFICATION, config: {} });
    renderActions(currentWorkflow.actions);
  }

  function removeAction(idx) {
    if (!currentWorkflow) return;
    currentWorkflow.actions.splice(idx, 1);
    renderActions(currentWorkflow.actions);
  }

  function openActionConfig(idx) {
    if (!currentWorkflow) return;
    const action = currentWorkflow.actions[idx];
    const props = document.getElementById('wf-action-props');
    props.innerHTML = renderActionConfigForm(action, idx);
    // 필드 바인딩
    props.querySelectorAll('input, select, textarea').forEach(el => {
      el.addEventListener('change', () => {
        const key = el.dataset.key;
        const val = el.type === 'checkbox' ? el.checked : el.value;
        setNestedValue(action.config, key, val);
      });
    });
  }

  function renderActionConfigForm(action, idx) {
    const configs = {
      [ActionType.MOVE_DEAL_STAGE]: ['dealId', 'stage'],
      [ActionType.UPDATE_DEAL]: ['dealId', 'fields'],
      [ActionType.CREATE_DEAL]: ['fields'],
      [ActionType.CREATE_CONTACT]: ['fields'],
      [ActionType.CREATE_REMINDER]: ['fields'],
      [ActionType.SEND_NOTIFICATION]: ['userId', 'title', 'message', 'type'],
      [ActionType.SEND_EMAIL]: ['to', 'subject', 'html', 'templateId'],
      [ActionType.SEND_SMS]: ['to', 'message', 'templateId'],
      [ActionType.SEND_KAKAO]: ['to', 'templateId', 'variables'],
      [ActionType.SEND_WEBHOOK]: ['url', 'method', 'headers', 'body'],
      [ActionType.GENERATE_QUOTE]: ['dealId', 'templateId'],
      [ActionType.GENERATE_CONTRACT]: ['dealId', 'templateId'],
      [ActionType.SEND_DOCUMENT]: ['documentId', 'to', 'channel'],
      [ActionType.RUN_FUNCTION]: ['code'],
      [ActionType.DELAY]: ['ms'],
      [ActionType.CALL_API]: ['url', 'method', 'headers', 'body', 'saveAs'],
      [ActionType.LOG_EVENT]: ['level', 'message', 'meta'],
    };
    const fields = configs[action.type] || [];
    return `
      <h5>${getActionLabel(action.type)}</h5>
      ${fields.map(f => `
        <div class="field">
          <label>${f}</label>
          ${f === 'code' ? `<textarea data-key="${f}" rows="6" style="font-family:monospace;font-size:12px;">${esc(action.config[f] || '')}</textarea>` :
           f === 'fields' || f === 'variables' || f === 'headers' || f === 'body' ? `<textarea data-key="${f}" rows="4" style="font-family:monospace;font-size:12px;">${esc(JSON.stringify(action.config[f] || {}, null, 2))}</textarea>` :
           `<input type="text" data-key="${f}" value="${esc(action.config[f] || '')}" placeholder="{{deal.id}} 등 컨텍스트 변수 사용 가능">`}
        </div>
      `).join('')}
      ${fields.length === 0 ? `<p class="text-muted">${t('no_config')}</p>` : ''}
    `;
  }

  // ──────────────────────────────────────────────
  // 저장
  // ──────────────────────────────────────────────
  function saveWorkflow() {
    const name = document.getElementById('wf-name').value.trim();
    if (!name) return alert(t('name_required'));

    const wf = {
      name,
      description: document.getElementById('wf-desc').value.trim(),
      enabled: document.getElementById('wf-enabled').checked,
      trigger: document.getElementById('wf-trigger').value,
      cron: document.getElementById('wf-cron').value.trim() || undefined,
      conditions: currentWorkflow?.conditions || [],
      actions: currentWorkflow?.actions || [],
    };

    if (currentWorkflow?.id) {
      AUTOMATION.updateWorkflow(currentWorkflow.id, wf);
    } else {
      AUTOMATION.createWorkflow(wf);
    }
    closeWorkflowModal();
    refreshPanel('workflows');
  }

  // ──────────────────────────────────────────────
  // 템플릿 사용
  // ──────────────────────────────────────────────
  function useTemplate(idx) {
    const tpl = AUTOMATION_ALL_TEMPLATES[idx];
    const wf = {
      name: tpl.name,
      description: tpl.description,
      enabled: false,
      trigger: tpl.trigger,
      cron: tpl.cron,
      conditions: tpl.conditions || [],
      actions: tpl.actions || [],
    };
    AUTOMATION.createWorkflow(wf);
    refreshPanel('workflows');
    // 워크플로 탭으로 이동
    document.querySelector('.tab-btn[data-tab="workflows"]').click();
  }

  function filterTemplates(industry) {
    // 현재는 전체 표시, 산업별 필터링은 템플릿에 industry 필드 추가 시 구현
    const grid = document.getElementById('template-grid');
    const all = AUTOMATION_ALL_TEMPLATES || [];
    grid.innerHTML = all.map((tpl, idx) => renderTemplateCard(tpl, idx)).join('');
    grid.querySelectorAll('.btn-use-template').forEach(b => b.addEventListener('click', e => useTemplate(parseInt(e.target.dataset.idx))));
  }

  // ──────────────────────────────────────────────
  // 로그 상세
  // ──────────────────────────────────────────────
  function showLogDetail(id) {
    const log = AUTOMATION.getExecutionLogs().find(l => l.id === id);
    if (!log) return;
    const body = document.getElementById('log-detail-body');
    body.innerHTML = `
      <div class="log-detail">
        <div class="log-meta">
          <span class="status-tag ${log.status}">${log.status}</span>
          <span>${fmtDate(log.startedAt)} ~ ${log.completedAt ? fmtDate(log.completedAt) : '-'}</span>
          <span>${log.trigger}</span>
        </div>
        <h4>${esc(log.workflowName)}</h4>
        <div class="log-steps">
          ${log.steps?.map((s, i) => `
            <div class="log-step ${s.status}">
              <div class="step-header">
                <span>#${i + 1} ${getActionLabel(s.action)}</span>
                <span class="step-status ${s.status}">${s.status}</span>
              </div>
              ${s.error ? `<div class="step-error">${esc(s.error)}</div>` : ''}
              <div class="step-time">${fmtDate(s.startedAt)} ~ ${s.completedAt ? fmtDate(s.completedAt) : '-'}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    document.getElementById('log-modal').style.display = 'flex';
  }

  // ──────────────────────────────────────────────
  // 패널 새로고침
  // ──────────────────────────────────────────────
  function refreshPanel(panel) {
    const root = document.getElementById('root');
    if (!root) return;
    const content = root.querySelector('#content');
    if (content) content.innerHTML = renderAutomationDashboard();
    bindAutomation();
  }

  // ──────────────────────────────────────────────
  // 공개
  // ──────────────────────────────────────────────
  return {
    render: renderAutomationDashboard,
    bind: bindAutomation,
    refresh: refreshPanel,
  };
})();

window.AUTOMATION_UI = AUTOMATION_UI;