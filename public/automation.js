/**
 * BizFlow Workflow Automation Engine
 * 트리거 → 조건 → 액션 완전 자동화
 * public/automation.js
 */

const AUTOMATION = (() => {
  // ──────────────────────────────────────────────
  // 타입 정의
  // ──────────────────────────────────────────────
  const TriggerType = {
    DEAL_STAGE_CHANGED: 'deal_stage_changed',
    DEAL_CREATED: 'deal_created',
    DEAL_UPDATED: 'deal_updated',
    CONTACT_CREATED: 'contact_created',
    CONTACT_UPDATED: 'contact_updated',
    PAYMENT_RECEIVED: 'payment_received',
    PAYMENT_FAILED: 'payment_failed',
    REMINDER_DUE: 'reminder_due',
    REMINDER_OVERDUE: 'reminder_overdue',
    SCHEDULED_TIME: 'scheduled_time',      // 크론
    WEBHOOK_RECEIVED: 'webhook_received',  // 외부 시스템
    INACTIVITY: 'inactivity',              // N일 무응답/정체
    CUSTOM_EVENT: 'custom_event',
  };

  const ConditionType = {
    EQUALS: 'equals',
    NOT_EQUALS: 'not_equals',
    CONTAINS: 'contains',
    NOT_CONTAINS: 'not_contains',
    GREATER_THAN: 'gt',
    LESS_THAN: 'lt',
    GREATER_EQUAL: 'gte',
    LESS_EQUAL: 'lte',
    IN: 'in',
    NOT_IN: 'not_in',
    IS_EMPTY: 'is_empty',
    IS_NOT_EMPTY: 'is_not_empty',
    REGEX_MATCH: 'regex',
    DAYS_SINCE: 'days_since',
    DAYS_UNTIL: 'days_until',
  };

  const ActionType = {
    // 딜 액션
    MOVE_DEAL_STAGE: 'move_deal_stage',
    UPDATE_DEAL: 'update_deal',
    ASSIGN_DEAL: 'assign_deal',
    CREATE_DEAL: 'create_deal',
    DELETE_DEAL: 'delete_deal',
    // 연락처 액션
    CREATE_CONTACT: 'create_contact',
    UPDATE_CONTACT: 'update_contact',
    TAG_CONTACT: 'tag_contact',
    // 리마인더/태스크
    CREATE_REMINDER: 'create_reminder',
    COMPLETE_REMINDER: 'complete_reminder',
    // 알림
    SEND_NOTIFICATION: 'send_notification',
    SEND_EMAIL: 'send_email',
    SEND_SMS: 'send_sms',
    SEND_KAKAO: 'send_kakao',
    SEND_SLACK: 'send_slack',
    SEND_WEBHOOK: 'send_webhook',
    // 문서/PDF
    GENERATE_QUOTE: 'generate_quote',
    GENERATE_CONTRACT: 'generate_contract',
    SEND_DOCUMENT: 'send_document',
    // 시스템
    RUN_FUNCTION: 'run_function',          // 커스텀 JS 함수
    DELAY: 'delay',                        // 대기 (ms)
    CALL_API: 'call_api',                  // 외부 API 호출
    LOG_EVENT: 'log_event',
  };

  // ──────────────────────────────────────────────
  // 스토리지 키
  // ──────────────────────────────────────────────
  const STORAGE_KEY = 'bizflow_workflows';
  const EXECUTION_LOG_KEY = 'bizflow_workflow_executions';

  // ──────────────────────────────────────────────
  // 유틸: 조건 평가
  // ──────────────────────────────────────────────
  function evaluateCondition(condition, context) {
    const { field, operator, value } = condition;
    const actual = getNestedValue(context, field);

    switch (operator) {
      case ConditionType.EQUALS: return actual === value;
      case ConditionType.NOT_EQUALS: return actual !== value;
      case ConditionType.CONTAINS: return String(actual || '').includes(String(value));
      case ConditionType.NOT_CONTAINS: return !String(actual || '').includes(String(value));
      case ConditionType.GREATER_THAN: return Number(actual) > Number(value);
      case ConditionType.LESS_THAN: return Number(actual) < Number(value);
      case ConditionType.GREATER_EQUAL: return Number(actual) >= Number(value);
      case ConditionType.LESS_EQUAL: return Number(actual) <= Number(value);
      case ConditionType.IN: return Array.isArray(value) && value.includes(actual);
      case ConditionType.NOT_IN: return Array.isArray(value) && !value.includes(actual);
      case ConditionType.IS_EMPTY: return actual === null || actual === undefined || actual === '';
      case ConditionType.IS_NOT_EMPTY: return actual !== null && actual !== undefined && actual !== '';
      case ConditionType.REGEX_MATCH: return new RegExp(value).test(String(actual || ''));
      case ConditionType.DAYS_SINCE:
        if (!actual) return false;
        const diff = (Date.now() - new Date(actual).getTime()) / (1000 * 60 * 60 * 24);
        return diff >= Number(value);
      case ConditionType.DAYS_UNTIL:
        if (!actual) return false;
        const diff2 = (new Date(actual).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return diff2 <= Number(value) && diff2 >= 0;
      default: return false;
    }
  }

  function getNestedValue(obj, path) {
    if (!path) return obj;
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
  }

  function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => o[k] = o[k] || {}, obj);
    target[last] = value;
  }

  // ──────────────────────────────────────────────
  // 워크플로 실행 엔진
  // ──────────────────────────────────────────────
  async function executeWorkflow(workflow, triggerContext) {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const log = {
      id: executionId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      trigger: triggerContext.triggerType,
      startedAt: new Date().toISOString(),
      steps: [],
      status: 'running',
    };

    const context = { ...triggerContext, workflow, executionId };

    try {
      // 조건 검사
      if (workflow.conditions && workflow.conditions.length > 0) {
        const allMet = workflow.conditions.every(c => evaluateCondition(c, context));
        if (!allMet) {
          log.status = 'skipped';
          log.reason = 'conditions_not_met';
          log.completedAt = new Date().toISOString();
          saveExecutionLog(log);
          return log;
        }
      }

      // 액션 순차 실행
      for (let i = 0; i < workflow.actions.length; i++) {
        const action = workflow.actions[i];
        const stepLog = {
          index: i,
          action: action.type,
          startedAt: new Date().toISOString(),
        };

        try {
          await executeAction(action, context);
          stepLog.status = 'success';
        } catch (e) {
          stepLog.status = 'failed';
          stepLog.error = e.message;
          log.status = 'failed';
          log.steps.push(stepLog);
          saveExecutionLog(log);
          throw e;
        }
        stepLog.completedAt = new Date().toISOString();
        log.steps.push(stepLog);
      }

      log.status = 'success';
      log.completedAt = new Date().toISOString();
    } catch (e) {
      log.status = log.status || 'failed';
      log.error = e.message;
      log.completedAt = new Date().toISOString();
    }

    saveExecutionLog(log);
    return log;
  }

  // ──────────────────────────────────────────────
  // 액션 실행기
  // ──────────────────────────────────────────────
  async function executeAction(action, context) {
    const { type, config = {} } = action;
    const api = window.api || ((path, opts) => fetch(API(path), opts).then(r => r.json()));

    switch (type) {
      // ─── 딜 ───
      case ActionType.MOVE_DEAL_STAGE: {
        const { dealId, stage } = config;
        const id = dealId || context.deal?.id || context.payload?.dealId;
        if (!id) throw new Error('dealId required');
        await api(`/deals/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ stage: resolveValue(stage, context) }),
        });
        break;
      }
      case ActionType.UPDATE_DEAL: {
        const { dealId, fields } = config;
        const id = dealId || context.deal?.id || context.payload?.dealId;
        if (!id) throw new Error('dealId required');
        const data = {};
        for (const [k, v] of Object.entries(fields)) data[k] = resolveValue(v, context);
        await api(`/deals/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
        break;
      }
      case ActionType.ASSIGN_DEAL: {
        const { dealId, userId } = config;
        const id = dealId || context.deal?.id || context.payload?.dealId;
        if (!id) throw new Error('dealId required');
        await api(`/deals/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ assignedTo: resolveValue(userId, context) }),
        });
        break;
      }
      case ActionType.CREATE_DEAL: {
        const data = {};
        for (const [k, v] of Object.entries(config.fields || {})) data[k] = resolveValue(v, context);
        data.workspaceId = data.workspaceId || state.currentWorkspace?.id;
        const res = await api('/deals', { method: 'POST', body: JSON.stringify(data) });
        context.createdDeal = res;
        break;
      }

      // ─── 연락처 ───
      case ActionType.CREATE_CONTACT: {
        const data = {};
        for (const [k, v] of Object.entries(config.fields || {})) data[k] = resolveValue(v, context);
        data.workspaceId = data.workspaceId || state.currentWorkspace?.id;
        const res = await api('/contacts', { method: 'POST', body: JSON.stringify(data) });
        context.createdContact = res;
        break;
      }
      case ActionType.UPDATE_CONTACT: {
        const { contactId, fields } = config;
        const id = contactId || context.contact?.id || context.payload?.contactId;
        if (!id) throw new Error('contactId required');
        const data = {};
        for (const [k, v] of Object.entries(fields)) data[k] = resolveValue(v, context);
        await api(`/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
        break;
      }
      case ActionType.TAG_CONTACT: {
        const { contactId, tags, operation } = config; // operation: add|remove|set
        const id = contactId || context.contact?.id || context.payload?.contactId;
        if (!id) throw new Error('contactId required');
        const contact = await api(`/contacts/${id}`);
        let current = contact.tags || [];
        const newTags = Array.isArray(tags) ? tags : [tags];
        if (operation === 'add') current = [...new Set([...current, ...newTags])];
        else if (operation === 'remove') current = current.filter(t => !newTags.includes(t));
        else current = newTags;
        await api(`/contacts/${id}`, { method: 'PATCH', body: JSON.stringify({ tags: current }) });
        break;
      }

      // ─── 리마인더 ───
      case ActionType.CREATE_REMINDER: {
        const data = {};
        for (const [k, v] of Object.entries(config.fields || {})) data[k] = resolveValue(v, context);
        data.workspaceId = data.workspaceId || state.currentWorkspace?.id;
        const res = await api('/reminders', { method: 'POST', body: JSON.stringify(data) });
        context.createdReminder = res;
        break;
      }
      case ActionType.COMPLETE_REMINDER: {
        const { reminderId } = config;
        const id = reminderId || context.reminder?.id || context.payload?.reminderId;
        if (!id) throw new Error('reminderId required');
        await api(`/reminders/${id}`, { method: 'PATCH', body: JSON.stringify({ completed: true }) });
        break;
      }

      // ─── 알림 ───
      case ActionType.SEND_NOTIFICATION: {
        const { userId, title, message, type } = config;
        await api('/notifications', {
          method: 'POST',
          body: JSON.stringify({
            workspaceId: state.currentWorkspace?.id,
            userId: resolveValue(userId, context) || state.user?.id,
            title: resolveValue(title, context),
            message: resolveValue(message, context),
            type: type || 'info',
          }),
        });
        break;
      }
      case ActionType.SEND_EMAIL: {
        const { to, subject, html, templateId } = config;
        await api('/communications/email', {
          method: 'POST',
          body: JSON.stringify({
            to: resolveValue(to, context),
            subject: resolveValue(subject, context),
            html: resolveValue(html, context),
            templateId,
            context: sanitizeContext(context),
          }),
        });
        break;
      }
      case ActionType.SEND_SMS: {
        const { to, message, templateId } = config;
        await api('/communications/sms', {
          method: 'POST',
          body: JSON.stringify({
            to: resolveValue(to, context),
            message: resolveValue(message, context),
            templateId,
            context: sanitizeContext(context),
          }),
        });
        break;
      }
      case ActionType.SEND_KAKAO: {
        const { to, templateId, variables } = config;
        await api('/communications/kakao', {
          method: 'POST',
          body: JSON.stringify({
            to: resolveValue(to, context),
            templateId,
            variables: resolveVariables(variables, context),
          }),
        });
        break;
      }
      case ActionType.SEND_SLACK: {
        const { channel, text, blocks } = config;
        await api('/communications/slack', {
          method: 'POST',
          body: JSON.stringify({
            channel: resolveValue(channel, context),
            text: resolveValue(text, context),
            blocks: blocks ? JSON.parse(resolveValue(JSON.stringify(blocks), context)) : undefined,
          }),
        });
        break;
      }
      case ActionType.SEND_WEBHOOK: {
        const { url, method = 'POST', headers = {}, body } = config;
        await fetch(resolveValue(url, context), {
          method,
          headers: { 'Content-Type': 'application/json', ...headers },
          body: body ? JSON.stringify(resolveValue(body, context)) : JSON.stringify(sanitizeContext(context)),
        });
        break;
      }

      // ─── 문서/PDF ───
      case ActionType.GENERATE_QUOTE: {
        const { dealId, templateId } = config;
        const id = dealId || context.deal?.id || context.payload?.dealId;
        if (!id) throw new Error('dealId required');
        const res = await api(`/documents/quote`, {
          method: 'POST',
          body: JSON.stringify({ dealId: id, templateId }),
        });
        context.generatedQuote = res;
        break;
      }
      case ActionType.GENERATE_CONTRACT: {
        const { dealId, templateId } = config;
        const id = dealId || context.deal?.id || context.payload?.dealId;
        if (!id) throw new Error('dealId required');
        const res = await api(`/documents/contract`, {
          method: 'POST',
          body: JSON.stringify({ dealId: id, templateId }),
        });
        context.generatedContract = res;
        break;
      }
      case ActionType.SEND_DOCUMENT: {
        const { documentId, to, channel } = config;
        await api(`/documents/${documentId || context.generatedQuote?.id || context.generatedContract?.id}/send`, {
          method: 'POST',
          body: JSON.stringify({ to: resolveValue(to, context), channel: channel || 'email' }),
        });
        break;
      }

      // ─── 시스템 ───
      case ActionType.RUN_FUNCTION: {
        const { code } = config;
        if (!code) throw new Error('code required');
        // 템플릿 코드는 top-level await/return 을 사용하므로 async IIFE 로 감싼다
        const fn = new Function('context', 'api', 'state', 't', 'utils', `return (async () => {\n${code}\n})();`);
        const result = await fn(context, api, state, t, {
          evaluateCondition,
          getNestedValue,
          resolveValue,
          sanitizeContext,
        });
        if (result !== undefined) context.functionResult = result;
        break;
      }
      case ActionType.DELAY: {
        const { ms } = config;
        await new Promise(r => setTimeout(r, Number(resolveValue(ms, context))));
        break;
      }
      case ActionType.CALL_API: {
        const { url, method = 'GET', headers = {}, body, saveAs } = config;
        const res = await fetch(resolveValue(url, context), {
          method,
          headers: { 'Content-Type': 'application/json', ...headers },
          body: body ? JSON.stringify(resolveValue(body, context)) : undefined,
        });
        const data = await res.json();
        if (saveAs) context[saveAs] = data;
        break;
      }
      case ActionType.LOG_EVENT: {
        const { level = 'info', message, meta } = config;
        console.log(`[WF:${context.workflowName}]`, level, resolveValue(message, context), meta);
        break;
      }
      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  }

  // ──────────────────────────────────────────────
  // 헬퍼: 컨텍스트 값 치환 ({{deal.name}} 등)
  // ──────────────────────────────────────────────
  function resolveValue(val, context) {
    if (typeof val !== 'string') return val;
    return val.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
      const v = getNestedValue(context, path);
      return v !== undefined ? v : `{{${path}}}`;
    });
  }

  function resolveVariables(vars, context) {
    if (!vars || typeof vars !== 'object') return vars;
    const out = {};
    for (const [k, v] of Object.entries(vars)) out[k] = resolveValue(v, context);
    return out;
  }

  function sanitizeContext(ctx) {
    const { workflow, executionId, api, ...safe } = ctx;
    return safe;
  }

  // ──────────────────────────────────────────────
  // 트리거 디스패처 (이벤트 발생 시 워크플로 실행)
  // ──────────────────────────────────────────────
  const triggerCallbacks = new Map();

  function onTrigger(triggerType, callback) {
    if (!triggerCallbacks.has(triggerType)) triggerCallbacks.set(triggerType, []);
    triggerCallbacks.get(triggerType).push(callback);
  }

  async function dispatchTrigger(triggerType, payload) {
    const workflows = getWorkflows().filter(w => w.enabled && w.trigger === triggerType);
    const context = { triggerType, payload, timestamp: new Date().toISOString() };

    // 등록된 콜백 실행
    const callbacks = triggerCallbacks.get(triggerType) || [];
    await Promise.all(callbacks.map(cb => cb(payload).catch(e => console.error('Trigger callback error:', e))));

    // 매칭되는 워크플로 실행
    await Promise.all(workflows.map(w => executeWorkflow(w, context).catch(e => {
      console.error(`Workflow ${w.name} failed:`, e);
    })));
  }

  // ──────────────────────────────────────────────
  // 편의 함수: 기존 CRM 함수들에 훅 추가
  // ──────────────────────────────────────────────
  function patchCRMFunctions() {
    // 딜 스테이지 변경 감지
    const originalPatchDeal = window.api;
    window.api = async (path, opts) => {
      const res = await originalPatchDeal(path, opts);
      if (opts?.method === 'PATCH' && path.startsWith('/deals/') && opts.body) {
        const body = JSON.parse(opts.body);
        if (body.stage) {
          const dealId = path.split('/')[2];
          const deal = await originalPatchDeal(`/deals/${dealId}`);
          dispatchTrigger(TriggerType.DEAL_STAGE_CHANGED, { dealId, deal, newStage: body.stage, previousStage: deal.stage });
        }
      }
      return res;
    };

    // 결제 수신 감지 (웹훅 엔드포인트에서 호출)
    window.onPaymentReceived = (payment) => dispatchTrigger(TriggerType.PAYMENT_RECEIVED, payment);
    window.onPaymentFailed = (payment) => dispatchTrigger(TriggerType.PAYMENT_FAILED, payment);

    // 리마인더 기한 감지 (스케줄러에서 호출)
    window.checkReminders = async () => {
      const now = new Date();
      const reminders = state.reminders || [];
      for (const r of reminders) {
        if (r.completed) continue;
        const due = new Date(r.dueAt);
        if (due <= now) {
          dispatchTrigger(TriggerType.REMINDER_DUE, { reminder: r });
        } else if ((due - now) / (1000 * 60 * 60) <= 1) { // 1시간 전
          dispatchTrigger(TriggerType.REMINDER_OVERDUE, { reminder: r });
        }
      }
    };
  }

  // ──────────────────────────────────────────────
  // 스케줄러 (크론)
  // ──────────────────────────────────────────────
  const scheduledJobs = new Map();

  function scheduleWorkflow(workflowId, cronExpression) {
    // 단순 구현: 분 단위 체크
    const job = setInterval(() => {
      const workflow = getWorkflows().find(w => w.id === workflowId);
      if (workflow && workflow.enabled && workflow.trigger === TriggerType.SCHEDULED_TIME) {
        dispatchTrigger(TriggerType.SCHEDULED_TIME, { workflowId, cron: cronExpression });
      }
    }, 60000); // 매 분 체크 (실제로는 cron 파서 필요)
    scheduledJobs.set(workflowId, job);
  }

  function unscheduleWorkflow(workflowId) {
    const job = scheduledJobs.get(workflowId);
    if (job) clearInterval(job);
    scheduledJobs.delete(workflowId);
  }

  // ──────────────────────────────────────────────
  // 저장소
  // ──────────────────────────────────────────────
  function getWorkflows() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
  }

  function saveWorkflows(workflows) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
  }

  function getExecutionLogs(limit = 100) {
    try {
      return JSON.parse(localStorage.getItem(EXECUTION_LOG_KEY) || '[]').slice(-limit).reverse();
    } catch { return []; }
  }

  function saveExecutionLog(log) {
    try {
      const logs = JSON.parse(localStorage.getItem(EXECUTION_LOG_KEY) || '[]');
      logs.push(log);
      if (logs.length > 1000) logs.splice(0, logs.length - 1000);
      localStorage.setItem(EXECUTION_LOG_KEY, JSON.stringify(logs));
    } catch {}
  }

  // ──────────────────────────────────────────────
  // 라벨 헬퍼 (UI용)
  // ──────────────────────────────────────────────
  function getTriggerLabel(trigger) {
    const labels = {
      [TriggerType.DEAL_STAGE_CHANGED]: '딜 스테이지 변경',
      [TriggerType.DEAL_CREATED]: '딜 생성',
      [TriggerType.DEAL_UPDATED]: '딜 수정',
      [TriggerType.CONTACT_CREATED]: '연락처 생성',
      [TriggerType.CONTACT_UPDATED]: '연락처 수정',
      [TriggerType.PAYMENT_RECEIVED]: '결제 완료',
      [TriggerType.PAYMENT_FAILED]: '결제 실패',
      [TriggerType.REMINDER_DUE]: '리마인더 마감',
      [TriggerType.REMINDER_OVERDUE]: '리마인더 지연',
      [TriggerType.SCHEDULED_TIME]: '예약 실행',
      [TriggerType.WEBHOOK_RECEIVED]: '웹훅 수신',
      [TriggerType.INACTIVITY]: '장기 미활동',
      [TriggerType.CUSTOM_EVENT]: '사용자 이벤트',
    };
    return labels[trigger] || trigger;
  }

  function getConditionLabel(condition) {
    const labels = {
      [ConditionType.EQUALS]: '같음',
      [ConditionType.NOT_EQUALS]: '다름',
      [ConditionType.CONTAINS]: '포함',
      [ConditionType.NOT_CONTAINS]: '미포함',
      [ConditionType.GREATER_THAN]: '초과',
      [ConditionType.LESS_THAN]: '미만',
      [ConditionType.GREATER_EQUAL]: '이상',
      [ConditionType.LESS_EQUAL]: '이하',
      [ConditionType.IN]: '포함됨',
      [ConditionType.NOT_IN]: '미포함',
      [ConditionType.IS_EMPTY]: '비어있음',
      [ConditionType.IS_NOT_EMPTY]: '비어있지 않음',
      [ConditionType.REGEX_MATCH]: '정규식 매치',
      [ConditionType.DAYS_SINCE]: '경과일수',
      [ConditionType.DAYS_UNTIL]: '남은일수',
    };
    return labels[condition] || condition;
  }

  function getActionLabel(action) {
    const labels = {
      [ActionType.MOVE_DEAL_STAGE]: '딜 스테이지 이동',
      [ActionType.UPDATE_DEAL]: '딜 수정',
      [ActionType.CREATE_DEAL]: '딜 생성',
      [ActionType.CREATE_CONTACT]: '연락처 생성',
      [ActionType.UPDATE_CONTACT]: '연락처 수정',
      [ActionType.TAG_CONTACT]: '연락처 태그',
      [ActionType.CREATE_REMINDER]: '리마인더 생성',
      [ActionType.COMPLETE_REMINDER]: '리마인더 완료',
      [ActionType.SEND_NOTIFICATION]: '앱 알림 전송',
      [ActionType.SEND_EMAIL]: '이메일 전송',
      [ActionType.SEND_SMS]: '문자 전송',
      [ActionType.SEND_KAKAO]: '카카오톡 전송',
      [ActionType.SEND_SLACK]: '슬랙 전송',
      [ActionType.SEND_WEBHOOK]: '웹훅 호출',
      [ActionType.GENERATE_QUOTE]: '견적서 생성',
      [ActionType.GENERATE_CONTRACT]: '계약서 생성',
      [ActionType.SEND_DOCUMENT]: '문서 발송',
      [ActionType.RUN_FUNCTION]: '함수 실행',
      [ActionType.DELAY]: '대기',
      [ActionType.CALL_API]: 'API 호출',
      [ActionType.LOG_EVENT]: '로그 기록',
    };
    return labels[action] || action;
  }

  function getActionIcon(action) {
    const icons = {
      [ActionType.MOVE_DEAL_STAGE]: '➡️',
      [ActionType.UPDATE_DEAL]: '✏️',
      [ActionType.CREATE_DEAL]: '➕',
      [ActionType.CREATE_CONTACT]: '👤',
      [ActionType.UPDATE_CONTACT]: '👤',
      [ActionType.TAG_CONTACT]: '🏷️',
      [ActionType.CREATE_REMINDER]: '⏰',
      [ActionType.COMPLETE_REMINDER]: '✅',
      [ActionType.SEND_NOTIFICATION]: '🔔',
      [ActionType.SEND_EMAIL]: '📧',
      [ActionType.SEND_SMS]: '💬',
      [ActionType.SEND_KAKAO]: '💬',
      [ActionType.SEND_SLACK]: '💬',
      [ActionType.SEND_WEBHOOK]: '🔗',
      [ActionType.GENERATE_QUOTE]: '📄',
      [ActionType.GENERATE_CONTRACT]: '📋',
      [ActionType.SEND_DOCUMENT]: '📤',
      [ActionType.RUN_FUNCTION]: '⚙️',
      [ActionType.DELAY]: '⏳',
      [ActionType.CALL_API]: '🌐',
      [ActionType.LOG_EVENT]: '📝',
    };
    return icons[action] || '⚙️';
  }

  // ──────────────────────────────────────────────
  // 공개 API
  // ──────────────────────────────────────────────
  return {
    // 상수
    TriggerType,
    ConditionType,
    ActionType,

    // 핵심
    executeWorkflow,
    dispatchTrigger,
    onTrigger,

    // 워크플로 CRUD
    getWorkflows,
    saveWorkflows,
    createWorkflow: (wf) => {
      const workflows = getWorkflows();
      const newWf = { ...wf, id: wf.id || `wf_${Date.now()}`, createdAt: new Date().toISOString() };
      workflows.push(newWf);
      saveWorkflows(workflows);
      if (newWf.trigger === TriggerType.SCHEDULED_TIME) scheduleWorkflow(newWf.id, newWf.cron);
      return newWf;
    },
    updateWorkflow: (id, updates) => {
      const workflows = getWorkflows().map(w => w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w);
      saveWorkflows(workflows);
      const wf = workflows.find(w => w.id === id);
      if (wf?.trigger === TriggerType.SCHEDULED_TIME) scheduleWorkflow(wf.id, wf.cron);
    },
    deleteWorkflow: (id) => {
      const workflows = getWorkflows().filter(w => w.id !== id);
      saveWorkflows(workflows);
      unscheduleWorkflow(id);
    },
    toggleWorkflow: (id, enabled) => {
      const workflows = getWorkflows().map(w => w.id === id ? { ...w, enabled } : w);
      saveWorkflows(workflows);
      const wf = workflows.find(w => w.id === id);
      if (enabled && wf?.trigger === TriggerType.SCHEDULED_TIME) scheduleWorkflow(wf.id, wf.cron);
      else if (!enabled) unscheduleWorkflow(id);
    },

    // 로그
    getExecutionLogs,

    // 유틸
    evaluateCondition,
    resolveValue,

    // 초기화
    init: () => {
      patchCRMFunctions();
      // 스케줄된 워크플로 복원
      getWorkflows().filter(w => w.enabled && w.trigger === TriggerType.SCHEDULED_TIME)
        .forEach(w => scheduleWorkflow(w.id, w.cron));
      // 리마인더 체크 (5분마다)
      setInterval(window.checkReminders, 5 * 60 * 1000);
      console.log('[Automation] Engine initialized');
    },
  };
})();

// 전역 노출
window.AUTOMATION = AUTOMATION;
window.TriggerType = AUTOMATION.TriggerType;
window.ConditionType = AUTOMATION.ConditionType;
window.ActionType = AUTOMATION.ActionType;

// UI 헬퍼 전역 노출
window.getTriggerLabel = (trigger) => {
  const labels = {
    deal_stage_changed: '딜 스테이지 변경',
    deal_created: '딜 생성',
    deal_updated: '딜 수정',
    contact_created: '연락처 생성',
    contact_updated: '연락처 수정',
    payment_received: '결제 완료',
    payment_failed: '결제 실패',
    reminder_due: '리마인더 마감',
    reminder_overdue: '리마인더 지연',
    scheduled_time: '예약 실행',
    webhook_received: '웹훅 수신',
    inactivity: '장기 미활동',
    custom_event: '사용자 이벤트',
  };
  return labels[trigger] || trigger;
};

window.getActionLabel = (action) => {
  const labels = {
    move_deal_stage: '딜 스테이지 이동',
    update_deal: '딜 수정',
    create_deal: '딜 생성',
    create_contact: '연락처 생성',
    update_contact: '연락처 수정',
    tag_contact: '연락처 태그',
    create_reminder: '리마인더 생성',
    complete_reminder: '리마인더 완료',
    send_notification: '앱 알림 전송',
    send_email: '이메일 전송',
    send_sms: '문자 전송',
    send_kakao: '카카오톡 전송',
    send_slack: '슬랙 전송',
    send_webhook: '웹훅 호출',
    generate_quote: '견적서 생성',
    generate_contract: '계약서 생성',
    send_document: '문서 발송',
    run_function: '함수 실행',
    delay: '대기',
    call_api: 'API 호출',
    log_event: '로그 기록',
  };
  return labels[action] || action;
};

window.getActionIcon = (action) => {
  const icons = {
    move_deal_stage: '➡️',
    update_deal: '✏️',
    create_deal: '➕',
    create_contact: '👤',
    update_contact: '👤',
    tag_contact: '🏷️',
    create_reminder: '⏰',
    complete_reminder: '✅',
    send_notification: '🔔',
    send_email: '📧',
    send_sms: '💬',
    send_kakao: '💬',
    send_slack: '💬',
    send_webhook: '🔗',
    generate_quote: '📄',
    generate_contract: '📋',
    send_document: '📤',
    run_function: '⚙️',
    delay: '⏳',
    call_api: '🌐',
    log_event: '📝',
  };
  return icons[action] || '⚙️';
};

window.getOperatorLabel = (op) => {
  const labels = {
    equals: '같음',
    not_equals: '다름',
    contains: '포함',
    not_contains: '미포함',
    gt: '초과',
    lt: '미만',
    gte: '이상',
    lte: '이하',
    'in': '포함됨',
    not_in: '미포함',
    is_empty: '비어있음',
    is_not_empty: '비어있지 않음',
    regex: '정규식 매치',
    days_since: '경과일수',
    days_until: '남은일수',
  };
  return labels[op] || op;
};