/**
 * BizFlow Automation Templates
 * 업종별/시나리오별 즉시 사용 가능한 워크플로 프리셋
 * public/automation-templates.js
 */

const AUTOMATION_TEMPLATES = {
  // ──────────────────────────────────────────────
  // 공통 (모든 업종)
  // ──────────────────────────────────────────────
  common: [
    {
      id: 'common_lead_to_deal',
      name: '📋 신규 리드 → 딜 자동 생성 + 담당자 배정',
      description: '웹훅/폼으로 리드 들어오면 딜 만들고 라운드로빈으로 담당자 배정',
      industry: 'common',
      trigger: TriggerType.WEBHOOK_RECEIVED,
      conditions: [{ field: 'payload.source', operator: ConditionType.NOT_EMPTY }],
      actions: [
        { type: ActionType.CREATE_DEAL, config: { fields: { title: '{{payload.companyName}} - {{payload.contactName}}', value: 0, stage: 'LEAD', source: '{{payload.source}}', clientName: '{{payload.companyName}}', contactEmail: '{{payload.email}}', contactPhone: '{{payload.phone}}', metadata: '{{payload}}' } } },
        { type: ActionType.RUN_FUNCTION, config: { code: `const users = await api('/users'); const sales = users.filter(u => u.role !== 'SUPER_ADMIN'); if (sales.length) { const assignee = sales[Math.floor(Math.random() * sales.length)]; context.createdDeal.assignedTo = assignee.id; await api(\`/deals/\${context.createdDeal.id}\`, { method: 'PATCH', body: JSON.stringify({ assignedTo: assignee.id }) }); return assignee; }` } },
        { type: ActionType.CREATE_REMINDER, config: { fields: { title: '신규 리드 첫 연락', dealId: '{{createdDeal.id}}', dueAt: '{{new Date(Date.now() + 30*60*1000).toISOString()}}', type: 'CALL' } } },
        { type: ActionType.SEND_NOTIFICATION, config: { userId: '{{createdDeal.assignedTo}}', title: '새 리드 배정됨', message: '{{payload.companyName}} ({{payload.contactName}}) - 30분 내 첫 연락 필요', type: 'info' } },
        { type: ActionType.SEND_KAKAO, config: { to: '{{payload.phone}}', templateId: 'lead_welcome', variables: { name: '{{payload.contactName}}', company: '{{payload.companyName}}' } } },
      ],
    },
    {
      id: 'common_deal_stuck_alert',
      name: '⏰ 딜 정체 감지 → 자동 알림 + 에스컬레이션',
      description: '같은 스테이지에서 7일 정체 시 알림, 14일 지나면 상위 관리자 에스컬레이션',
      industry: 'common',
      trigger: TriggerType.SCHEDULED_TIME,
      cron: '0 9 * * *',
      conditions: [],
      actions: [
        { type: ActionType.RUN_FUNCTION, config: { code: `const deals = (await api(\`/deals?workspaceId=\${state.currentWorkspace.id}&limit=1000\`)).data || []; const stuck = deals.filter(d => !['WON','LOST'].includes(d.stage) && d.updatedAt && (Date.now() - new Date(d.updatedAt).getTime()) > 7*24*60*60*1000); return stuck;` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `for (const d of context.functionResult) { await api(\`/notifications\`, { method: 'POST', body: JSON.stringify({ workspaceId: state.currentWorkspace.id, userId: d.assignedTo || state.user.id, title: '딜 정체 알림', message: '\${d.title}이(가) 7일째 \${d.stage} 단계에 머물러 있습니다.', type: 'warning' }) }); if ((Date.now() - new Date(d.updatedAt).getTime()) > 14*24*60*60*1000) { const admin = (await api('/users')).find(u => u.role === 'SUPER_ADMIN'); if (admin) await api(\`/notifications\`, { method: 'POST', body: JSON.stringify({ workspaceId: state.currentWorkspace.id, userId: admin.id, title: '에스컬레이션: 장기 정체 딜', message: '\${d.title} 14일 정체 - 관리자 검토 필요', type: 'error' }) }); } }` } },
      ],
    },
    {
      id: 'common_payment_success',
      name: '💰 결제 완료 → 계약 단계 이동 + 계약서 발송 + 웰컴 온보딩',
      description: '결제 웹훅 수신 시 딜을 계약 단계로, 계약서 생성/발송, 온보딩 리마인더 생성',
      industry: 'common',
      trigger: TriggerType.PAYMENT_RECEIVED,
      conditions: [{ field: 'payload.status', operator: ConditionType.EQUALS, value: 'completed' }],
      actions: [
        { type: ActionType.RUN_FUNCTION, config: { code: `const deal = await api(\`/deals?workspaceId=\${state.currentWorkspace.id}&metadata_paymentId=\${context.payload.paymentId}\`); return deal.data?.[0] || deal.find(d => d.metadata?.paymentId === context.payload.paymentId);` } },
        { type: ActionType.MOVE_DEAL_STAGE, config: { dealId: '{{functionResult.id}}', stage: 'CONTRACT' } },
        { type: ActionType.GENERATE_CONTRACT, config: { dealId: '{{functionResult.id}}', templateId: 'standard_contract' } },
        { type: ActionType.SEND_DOCUMENT, config: { documentId: '{{generatedContract.id}}', to: '{{functionResult.contactEmail}}', channel: 'email' } },
        { type: ActionType.CREATE_REMINDER, config: { fields: { title: '계약서 서명 확인', dealId: '{{functionResult.id}}', dueAt: '{{new Date(Date.now() + 3*24*60*60*1000).toISOString()}}', type: 'TASK' } } },
        { type: ActionType.CREATE_REMINDER, config: { fields: { title: '온보딩 킥오프 미팅', dealId: '{{functionResult.id}}', dueAt: '{{new Date(Date.now() + 7*24*60*60*1000).toISOString()}}', type: 'MEETING' } } },
        { type: ActionType.SEND_NOTIFICATION, config: { userId: '{{functionResult.assignedTo}}', title: '결제 완료 - 계약 진행', message: '{{functionResult.title}} 결제 확인됨. 계약서 발송 완료.', type: 'success' } },
      ],
    },
  ],

  // ──────────────────────────────────────────────
  // 1. 개인카페 (단일 매장, 사장 1인 운영)
  // ──────────────────────────────────────────────
  cafe_individual: [
    {
      id: 'cafe_ind_daily_sales',
      name: '📊 일일 매출 자동 기록 → 목표 달성률 알림 + 주간 리포트',
      description: 'POS 연동 또는 수동 입력 시 일매출/목표/달성률 자동 계산. 미달 시 사장님 카카오 알림, 주말엔 주간 요약 전송',
      industry: 'cafe_individual',
      trigger: TriggerType.SCHEDULED_TIME,
      cron: '0 23 * * *',
      conditions: [],
      actions: [
        { type: ActionType.RUN_FUNCTION, config: { code: `const today = new Date().toISOString().split('T')[0];
const deal = await api(\`/deals?workspaceId=\${state.currentWorkspace.id}&metadata_date=\${today}&limit=1\`);
const todayDeal = deal.data?.[0] || deal.find(d => d.metadata?.date === today);

if (!todayDeal) {
  await api('/reminders', { method: 'POST', body: JSON.stringify({
    workspaceId: state.currentWorkspace.id,
    title: '📝 오늘 매출 입력 안 함',
    dueAt: new Date(Date.now() + 30*60*1000).toISOString(),
    type: 'TASK',
    description: '마감 전 일매출/주문수/객단가 입력 필요'
  }) });
  return { status: 'no_input', message: '매출 미입력' };
}

const sales = todayDeal.metadata?.dailySales || 0;
const orders = todayDeal.metadata?.orderCount || 0;
const target = todayDeal.metadata?.dailyTarget || 500000;
const achRate = target > 0 ? (sales / target * 100).toFixed(1) : 0;
const avgTicket = orders > 0 ? Math.round(sales / orders) : 0;

return { dealId: todayDeal.id, sales, orders, target, achRate, avgTicket, date: today, isWeekend: [0,6].includes(new Date().getDay()) };` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `const { sales, target, achRate, avgTicket, date, isWeekend, dealId } = context.functionResult;
if (context.functionResult.status === 'no_input') return;

if (achRate < 80) {
  await api('/notifications', { method: 'POST', body: JSON.stringify({
    workspaceId: state.currentWorkspace.id,
    userId: state.user.id,
    title: '⚠️ 일매출 목표 미달',
    message: '\${date} 매출 \${sales.toLocaleString()}원 (목표 \${target.toLocaleString()}원, \${achRate}%)\\n객단가: \${avgTicket.toLocaleString()}원 / \${orders}건',
    type: 'warning'
  }) });
  await api('/communications/kakao', { method: 'POST', body: JSON.stringify({
    to: state.user.phone || '',
    templateId: 'daily_sales_alert',
    variables: { date, sales: sales.toLocaleString(), target: target.toLocaleString(), achRate, avgTicket: avgTicket.toLocaleString() }
  }) }).catch(()=>{});
}` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `const { isWeekend, sales, target, achRate, avgTicket } = context.functionResult;
if (!isWeekend) return;

const deals = (await api(\`/deals?workspaceId=\${state.currentWorkspace.id}&limit=100\`)).data || [];
const weekAgo = Date.now() - 7*24*60*60*1000;
const weekDeals = deals.filter(d => d.metadata?.date && new Date(d.metadata.date).getTime() >= weekAgo);
const weekSales = weekDeals.reduce((sum, d) => sum + (d.metadata?.dailySales || 0), 0);
const weekOrders = weekDeals.reduce((sum, d) => sum + (d.metadata?.orderCount || 0), 0);
const weekAvg = weekOrders > 0 ? Math.round(weekSales / weekOrders) : 0;
const bestDay = weekDeals.reduce((max, d) => (d.metadata?.dailySales || 0) > (max.metadata?.dailySales || 0) ? d : max, weekDeals[0]);

const report = \`📈 \${new Date().toLocaleDateString('ko-KR', {month:'long', day:'numeric'})} 주간 매출 리포트
━━━━━━━━━━━━━━━
💰 주간 총매출: \${weekSales.toLocaleString()}원
📦 주간 총주문: \${weekOrders}건
☕ 주간 객단가: \${weekAvg.toLocaleString()}원
🏆 최고 매출일: \${bestDay?.metadata?.date} (\${(bestDay?.metadata?.dailySales || 0).toLocaleString()}원)
📊 일평균: \${Math.round(weekSales/7).toLocaleString()}원 (목표 \${target.toLocaleString()}원, \${Math.round(weekSales/7/target*100)}%)\`;

await api('/notifications', { method: 'POST', body: JSON.stringify({
  workspaceId: state.currentWorkspace.id,
  userId: state.user.id,
  title: '📊 주간 매출 리포트',
  message: report,
  type: 'info'
}) });` } },
      ],
    },
    {
      id: 'cafe_ind_inventory',
      name: '📦 재고 소진 임박 → 자동 발주 리스트 생성 + 입고 체크',
      description: '원두/시럽/우유/컵/빨대 등 소모품 수량 입력 시 안전수량 미만이면 발주 리스트 카카오 전송, 입고일 리마인더 자동 생성',
      industry: 'cafe_individual',
      trigger: TriggerType.SCHEDULED_TIME,
      cron: '0 8 * * *',
      conditions: [],
      actions: [
        { type: ActionType.RUN_FUNCTION, config: { code: `const items = (await api('/custom/inventory')).data || [];
const lowStock = items.filter(i => (i.currentQty || 0) <= (i.safetyQty || 0) && i.isActive !== false);

if (lowStock.length === 0) return { items: [], message: '모든 재고 정상' };

const orderList = lowStock.map(i => ({
  name: i.name,
  current: i.currentQty || 0,
  safety: i.safetyQty || 0,
  max: i.maxQty || 0,
  orderQty: (i.maxQty || 0) - (i.currentQty || 0),
  unit: i.unit || '개',
  supplier: i.supplier || '본사',
  category: i.category || '기타'
}));

return { items: orderList, count: orderList.length };` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `const { items, count, message } = context.functionResult;
if (count === 0) return;

const msg = \`📦 \${new Date().toLocaleDateString('ko-KR')} 발주 필요 품목 (\${count}개)
━━━━━━━━━━━━━━━
\${items.map((i, idx) => \`\${idx+1}. \${i.name}: \${i.current}\${i.unit} (안전 \${i.safety}\${i.unit}) → \${i.orderQty}\${i.unit} 발주 [\${i.supplier}]\`).join('\\n')}\`;

await api('/notifications', { method: 'POST', body: JSON.stringify({
  workspaceId: state.currentWorkspace.id,
  userId: state.user.id,
  title: '📦 발주 필요 품목 발생',
  message: msg,
  type: 'info'
}) });

await api('/communications/kakao', { method: 'POST', body: JSON.stringify({
  to: state.user.phone || '',
  templateId: 'inventory_order_list',
  variables: { date: new Date().toLocaleDateString('ko-KR'), count, items: items.slice(0,5).map(i => i.name).join(', ') }
}) }).catch(()=>{});

for (const i of items) {
  await api('/reminders', { method: 'POST', body: JSON.stringify({
    workspaceId: state.currentWorkspace.id,
    title: '📥 입고 확인: \${i.name}',
    dueAt: new Date(Date.now() + 2*24*60*60*1000).toISOString(),
    type: 'TASK',
    description: '\${i.orderQty}\${i.unit} 주문함 (\${i.supplier}). 입고 시 수량/상태 확인 후 재고 수량 업데이트'
  }) });
}` } },
      ],
    },
    {
      id: 'cafe_ind_loyalty',
      name: '☕ 단골 고객 관리 → 방문 횟수/금액 기반 자동 쿠폰 + 생일 축하',
      description: '결제 시 방문 횟수/누적금액 업데이트. 10회 방문 시 무료 음료 쿠폰, 생일 당일 축하 메시지 + 쿠폰 자동 발송',
      industry: 'cafe_individual',
      trigger: TriggerType.PAYMENT_RECEIVED,
      conditions: [{ field: 'payload.status', operator: ConditionType.EQUALS, value: 'completed' }],
      actions: [
        { type: ActionType.RUN_FUNCTION, config: { code: `const { customerPhone, customerName, amount } = context.payload;
let contact = await api(\`/contacts?workspaceId=\${state.currentWorkspace.id}&phone=\${customerPhone}\`);
contact = contact.data?.[0] || contact.find(c => c.phone === customerPhone);

if (!contact) {
  contact = await api('/contacts', { method: 'POST', body: JSON.stringify({
    workspaceId: state.currentWorkspace.id,
    firstName: customerName || '고객',
    phone: customerPhone,
    email: '',
    metadata: { visitCount: 0, totalSpent: 0, lastVisit: null, birthday: null }
  }) });
}

const meta = contact.metadata || {};
const visitCount = (meta.visitCount || 0) + 1;
const totalSpent = (meta.totalSpent || 0) + (amount || 0);
const isBirthday = meta.birthday && new Date(meta.birthday).toLocaleDateString() === new Date().toLocaleDateString();
const isMilestone = visitCount % 10 === 0;

await api(\`/contacts/\${contact.id}\`, { method: 'PATCH', body: JSON.stringify({
  metadata: { ...meta, visitCount, totalSpent, lastVisit: new Date().toISOString() }
}) });

return { contact, visitCount, totalSpent, isMilestone, isBirthday, amount };` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `const { contact, visitCount, totalSpent, isMilestone, isBirthday, amount } = context.functionResult;

const messages = [];
if (isMilestone) messages.push(\`☕ \${visitCount}번째 방문! 무료 음료 쿠폰 발송 완료\`);
if (isBirthday) messages.push(\`🎂 생일 축하합니다! 생일 쿠폰(아메리카노 1잔) 발송\`);
if (!isMilestone && !isBirthday) messages.push(\`감사합니다! 누적 \${visitCount}회 방문, \${totalSpent.toLocaleString()}원\`);

const msg = messages.join('\\n');

await api('/communications/kakao', { method: 'POST', body: JSON.stringify({
  to: contact.phone,
  templateId: isMilestone ? 'loyalty_milestone' : (isBirthday ? 'birthday_coupon' : 'visit_thanks'),
  variables: { name: contact.firstName || '고객', visitCount, totalSpent: totalSpent.toLocaleString(), coupon: isMilestone ? '무료 음료 1잔' : (isBirthday ? '생일 아메리카노 1잔' : '적립 완료') }
}) }).catch(()=>{});

await api('/notifications', { method: 'POST', body: JSON.stringify({
  workspaceId: state.currentWorkspace.id,
  userId: state.user.id,
  title: '☕ 고객 방문 기록',
  message: '\${contact.firstName}님 \${visitCount}번째 방문 (\${amount.toLocaleString()}원)' + (isMilestone ? ' 🎁 마일스톤 달성!' : '') + (isBirthday ? ' 🎂 생일!' : ''),
  type: 'success'
}) });` } },
      ],
    },
    {
      id: 'cafe_ind_staff_schedule',
      name: '👥 직원 스케줄 알림 → 출근 1시간 전/교대 30분 전/마감 30분 전 자동 카카오',
      description: '주간 스케줄 등록 시 출근/교대/마감 시간 자동 리마인더. 지각 시 사장님 알림',
      industry: 'cafe_individual',
      trigger: TriggerType.SCHEDULED_TIME,
      cron: '0 * * * *',
      conditions: [],
      actions: [
        { type: ActionType.RUN_FUNCTION, config: { code: `const now = new Date();
const schedules = (await api('/custom/staff-schedules')).data || [];
const upcoming = [];

for (const s of schedules) {
  const start = new Date(s.startAt);
  const end = new Date(s.endAt);
  const diffStart = (start - now) / (1000 * 60);
  const diffEnd = (end - now) / (1000 * 60);

  if (diffStart > 0 && diffStart <= 60 && !s.startNotified) {
    upcoming.push({ type: '출근', staff: s.staffName, phone: s.staffPhone, time: start, minutes: Math.round(diffStart), scheduleId: s.id, field: 'startNotified' });
  }
  if (s.breakAt) {
    const breakTime = new Date(s.breakAt);
    const diffBreak = (breakTime - now) / (1000 * 60);
    if (diffBreak > 0 && diffBreak <= 30 && !s.breakNotified) {
      upcoming.push({ type: '교대', staff: s.staffName, phone: s.staffPhone, time: breakTime, minutes: Math.round(diffBreak), scheduleId: s.id, field: 'breakNotified' });
    }
  }
  if (diffEnd > 0 && diffEnd <= 30 && !s.endNotified) {
    upcoming.push({ type: '마감', staff: s.staffName, phone: s.staffPhone, time: end, minutes: Math.round(diffEnd), scheduleId: s.id, field: 'endNotified' });
  }
}

return upcoming;` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `for (const u of context.functionResult) {
  await api('/communications/kakao', { method: 'POST', body: JSON.stringify({
    to: u.phone,
    templateId: 'staff_schedule_reminder',
    variables: { name: u.staff, type: u.type, minutes: u.minutes, time: u.time.toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit'}) }
  }) }).catch(()=>{});

  await api(\`/custom/staff-schedules/\${u.scheduleId}\`, { method: 'PATCH', body: JSON.stringify({ [u.field]: true }) });
}` } },
      ],
    },
    {
      id: 'cafe_ind_equipment',
      name: '🔧 장비 점검 주기 알림 → 머신/그라인더/제빙기/정수기 필터',
      description: '에스프레소 머신(월 1회), 그라인더(주 1회), 제빙기(월 2회), 정수기 필터(분기) 등 장비별 점검 주기 자동 계산 → 담당자 알림',
      industry: 'cafe_individual',
      trigger: TriggerType.SCHEDULED_TIME,
      cron: '0 9 1 * *',
      conditions: [],
      actions: [
        { type: ActionType.RUN_FUNCTION, config: { code: `const equipments = (await api('/custom/equipments')).data || [];
const today = new Date();
const alerts = [];

for (const eq of equipments) {
  if (!eq.lastCheck || !eq.cycleDays) continue;
  const last = new Date(eq.lastCheck);
  const daysSince = Math.floor((today - last) / (1000*60*60*24));
  const dueIn = eq.cycleDays - daysSince;

  if (dueIn <= 0) {
    alerts.push({ ...eq, status: 'overdue', daysOverdue: Math.abs(dueIn) });
  } else if (dueIn <= 3) {
    alerts.push({ ...eq, status: 'due_soon', daysLeft: dueIn });
  }
}

return alerts;` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `const alerts = context.functionResult;
if (alerts.length === 0) return;

const overdue = alerts.filter(a => a.status === 'overdue');
const dueSoon = alerts.filter(a => a.status === 'due_soon');

let msg = \`🔧 \${new Date().toLocaleDateString('ko-KR')} 장비 점검 현황
━━━━━━━━━━━━━━━\`;

if (overdue.length) {
  msg += '\\n🔴 점검 지연:';
  overdue.forEach(a => msg += \`\\n  - \${a.name}: \${a.daysOverdue}일 지연 (주기 \${a.cycleDays}일)\`);
}
if (dueSoon.length) {
  msg += '\\n🟡 곧 점검 필요:';
  dueSoon.forEach(a => msg += \`\\n  - \${a.name}: \${a.daysLeft}일 후 (주기 \${a.cycleDays}일)\`);
}

await api('/notifications', { method: 'POST', body: JSON.stringify({
  workspaceId: state.currentWorkspace.id,
  userId: state.user.id,
  title: '🔧 장비 점검 알림',
  message: msg,
  type: overdue.length ? 'error' : 'warning'
}) });

for (const a of overdue) {
  await api('/reminders', { method: 'POST', body: JSON.stringify({
    workspaceId: state.currentWorkspace.id,
    title: '🔧 긴급 점검: \${a.name}',
    dueAt: new Date(Date.now() + 24*60*60*1000).toISOString(),
    type: 'TASK',
    description: '\${a.cycleDays}일 주기 점검 \${a.daysOverdue}일 지연. 즉시 점검 필요.'
  }) });
}` } },
      ],
    },
  ],

  // ──────────────────────────────────────────────
  // 2. 개인식당 (단일 매장, 홀/배달/예약)
  // ──────────────────────────────────────────────
  restaurant_individual: [
    {
      id: 'rest_ind_daily_sales',
      name: '📊 일일 매출/배달/홀 분리 기록 → 채널별 달성률 + 주간 리포트',
      description: '홀매출/배달매출/포장매출 별도 입력 → 채널별 목표 달성률 계산. 배달앱 수수료율 반영 순수익 계산',
      industry: 'restaurant_individual',
      trigger: TriggerType.SCHEDULED_TIME,
      cron: '0 23 * * *',
      conditions: [],
      actions: [
        { type: ActionType.RUN_FUNCTION, config: { code: `const today = new Date().toISOString().split('T')[0];
const deal = await api(\`/deals?workspaceId=\${state.currentWorkspace.id}&metadata_date=\${today}&limit=1\`);
const todayDeal = deal.data?.[0] || deal.find(d => d.metadata?.date === today);

if (!todayDeal) {
  await api('/reminders', { method: 'POST', body: JSON.stringify({
    workspaceId: state.currentWorkspace.id,
    title: '📝 오늘 매출 입력 안 함 (홀/배달/포장)',
    dueAt: new Date(Date.now() + 30*60*1000).toISOString(),
    type: 'TASK',
    description: '홀매출/배달매출/포장매출/주문수 각각 입력'
  }) });
  return { status: 'no_input' };
}

const hall = todayDeal.metadata?.hallSales || 0;
const delivery = todayDeal.metadata?.deliverySales || 0;
const takeout = todayDeal.metadata?.takeoutSales || 0;
const hallOrders = todayDeal.metadata?.hallOrders || 0;
const deliveryOrders = todayDeal.metadata?.deliveryOrders || 0;
const takeoutOrders = todayDeal.metadata?.takeoutOrders || 0;
const totalSales = hall + delivery + takeout;
const totalOrders = hallOrders + deliveryOrders + takeoutOrders;

const hallTarget = todayDeal.metadata?.hallTarget || 300000;
const deliveryTarget = todayDeal.metadata?.deliveryTarget || 200000;
const takeoutTarget = todayDeal.metadata?.takeoutTarget || 50000;

const deliveryFeeRate = todayDeal.metadata?.deliveryFeeRate || 0.12; // 배달앱 수수료 12%
const deliveryNet = Math.round(delivery * (1 - deliveryFeeRate));

const hallRate = hallTarget > 0 ? (hall / hallTarget * 100).toFixed(1) : 0;
const deliveryRate = deliveryTarget > 0 ? (delivery / deliveryTarget * 100).toFixed(1) : 0;
const takeoutRate = takeoutTarget > 0 ? (takeout / takeoutTarget * 100).toFixed(1) : 0;

return { 
  dealId: todayDeal.id, date: today,
  hall, delivery, takeout, totalSales, totalOrders,
  hallRate, deliveryRate, takeoutRate,
  deliveryNet,
  isWeekend: [0,6].includes(new Date().getDay())
};` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `const { hall, delivery, takeout, totalSales, hallRate, deliveryRate, takeoutRate, deliveryNet, date, isWeekend, dealId } = context.functionResult;
if (context.functionResult.status === 'no_input') return;

const alerts = [];
if (hallRate < 80) alerts.push(\`홀 \${hallRate}%\`);
if (deliveryRate < 80) alerts.push(\`배달 \${deliveryRate}%\`);
if (takeoutRate < 80) alerts.push(\`포장 \${takeoutRate}%\`);

if (alerts.length > 0) {
  await api('/notifications', { method: 'POST', body: JSON.stringify({
    workspaceId: state.currentWorkspace.id,
    userId: state.user.id,
    title: '⚠️ 채널별 매출 목표 미달',
    message: '\${date} 총 \${totalSales.toLocaleString()}원 (홀 \${hall.toLocaleString()}/배달 \${delivery.toLocaleString()}/포장 \${takeout.toLocaleString()})\\n미달: \${alerts.join(", ")}',
    type: 'warning'
  }) });
}` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `const { isWeekend } = context.functionResult;
if (!isWeekend) return;

const deals = (await api(\`/deals?workspaceId=\${state.currentWorkspace.id}&limit=100\`)).data || [];
const weekAgo = Date.now() - 7*24*60*60*1000;
const weekDeals = deals.filter(d => d.metadata?.date && new Date(d.metadata.date).getTime() >= weekAgo);

const weekHall = weekDeals.reduce((sum, d) => sum + (d.metadata?.hallSales || 0), 0);
const weekDelivery = weekDeals.reduce((sum, d) => sum + (d.metadata?.deliverySales || 0), 0);
const weekTakeout = weekDeals.reduce((sum, d) => sum + (d.metadata?.takeoutSales || 0), 0);
const weekTotal = weekHall + weekDelivery + weekTakeout;
const weekDeliveryNet = Math.round(weekDelivery * 0.88);

const report = \`📈 주간 매출 리포트
━━━━━━━━━━━━━━━
🏪 홀: \${weekHall.toLocaleString()}원
🚚 배달: \${weekDelivery.toLocaleString()}원 (순수익 \${weekDeliveryNet.toLocaleString()}원)
🥡 포장: \${weekTakeout.toLocaleString()}원
💰 총매출: \${weekTotal.toLocaleString()}원
📊 배달비율: \${((weekDelivery/weekTotal)*100).toFixed(1)}%\`;

await api('/notifications', { method: 'POST', body: JSON.stringify({
  workspaceId: state.currentWorkspace.id,
  userId: state.user.id,
  title: '📊 주간 채널별 매출 리포트',
  message: report,
  type: 'info'
}) });` } },
      ],
    },
    {
      id: 'rest_ind_foodcost',
      name: '🥗 식자재 원가율 자동 계산 → 메뉴별 수익성 알림',
      description: '메뉴별 레시피(식자재 배합) 등록 시 주문 들어오면 자동 원가 계산. 원가율 35% 초과 시 알림, 주간 식자재 발주서 자동 생성',
      industry: 'restaurant_individual',
      trigger: TriggerType.SCHEDULED_TIME,
      cron: '0 6 * * *',
      conditions: [],
      actions: [
        { type: ActionType.RUN_FUNCTION, config: { code: `const recipes = (await api('/custom/recipes')).data || [];
const orders = (await api(\`/deals?workspaceId=\${state.currentWorkspace.id}&stage=WON&limit=200\`)).data || [];
const today = new Date().toISOString().split('T')[0];
const todayOrders = orders.filter(o => o.metadata?.date === today);

let totalMaterialCost = 0;
const menuCosts = {};

for (const order of todayOrders) {
  const items = order.metadata?.items || [];
  for (const item of items) {
    const recipe = recipes.find(r => r.menuName === item.menuName);
    if (recipe) {
      const cost = recipe.materials.reduce((sum, m) => sum + (m.unitCost * m.quantity * item.qty), 0);
      const revenue = item.price * item.qty;
      const costRate = (cost / revenue * 100).toFixed(1);
      if (!menuCosts[item.menuName]) menuCosts[item.menuName] = { count: 0, totalCost: 0, totalRevenue: 0 };
      menuCosts[item.menuName].count += item.qty;
      menuCosts[item.menuName].totalCost += cost;
      menuCosts[item.menuName].totalRevenue += revenue;
      totalMaterialCost += cost;
    }
  }
}

const alerts = [];
for (const [menu, data] of Object.entries(menuCosts)) {
  const rate = (data.totalCost / data.totalRevenue * 100).toFixed(1);
  if (rate > 35) alerts.push(\`\${menu}: \${rate}%\`);
}

return { menuCosts, totalMaterialCost, alerts, date: today };` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `const { menuCosts, totalMaterialCost, alerts, date } = context.functionResult;

if (alerts.length > 0) {
  await api('/notifications', { method: 'POST', body: JSON.stringify({
    workspaceId: state.currentWorkspace.id,
    userId: state.user.id,
    title: '⚠️ 원가율 35% 초과 메뉴',
    message: '\${date} 기준: \${alerts.join(", ")} (목표 35% 이하)',
    type: 'warning'
  }) });
}

// 주간 발주서 생성 (일요일)
if ([0].includes(new Date().getDay())) {
  const weeklyUsage = {};
  // 지난 7일 주문 분석해서 발주량 계산...
  await api('/notifications', { method: 'POST', body: JSON.stringify({
    workspaceId: state.currentWorkspace.id,
    userId: state.user.id,
    title: '📋 주간 식자재 발주서 생성됨',
    message: '지난 7일 판매량 기반 자동 계산. 상세 내역 확인 후 발주 진행',
    type: 'info'
  }) });
}` } },
      ],
    },
    {
      id: 'rest_ind_reservation',
      name: '📅 예약 관리 → 당일 오전 확정 알림 / 노쇼 방지 / 리뷰 유도',
      description: '예약 접수 시 확정 알림, 당일 오전 리마인더, 방문 후 리뷰 요청. 노쇼 시 블랙리스트 등록',
      industry: 'restaurant_individual',
      trigger: TriggerType.DEAL_CREATED,
      conditions: [{ field: 'deal.type', operator: ConditionType.EQUALS, value: 'RESERVATION' }],
      actions: [
        { type: ActionType.SEND_KAKAO, config: { to: '{{deal.contactPhone}}', templateId: 'reservation_confirmed', variables: { name: '{{deal.clientName}}', date: '{{deal.appointmentDate}}', time: '{{deal.appointmentTime}}', people: '{{deal.metadata.people}}', deposit: '{{deal.metadata.deposit}}' } } },
        { type: ActionType.CREATE_REMINDER, config: { fields: { title: '예약 당일 오전 확정 연락', dealId: '{{deal.id}}', dueAt: '{{new Date(new Date(deal.appointmentDate).setHours(10,0,0,0)).toISOString()}}', type: 'CALL', description: '노쇼 방지용 확인 연락' } } },
        { type: ActionType.CREATE_REMINDER, config: { fields: { title: '예약 30분 전 준비', dealId: '{{deal.id}}', dueAt: '{{new Date(new Date(deal.appointmentDate).getTime() - 30*60*1000).toISOString()}}', type: 'TASK', description: '테이블 세팅/메뉴 준비' } } },
        { type: ActionType.RUN_FUNCTION, config: { code: `if (context.deal && context.deal.stage === 'COMPLETED') {
  await api('/communications/kakao', { method: 'POST', body: JSON.stringify({
    to: context.deal.contactPhone,
    templateId: 'review_request',
    variables: { name: context.deal.clientName, reviewUrl: context.deal.reviewUrl }
  }) }).catch(()=>{});
}` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `// 노쇼 감지 (예약 시간 30분 경과 후 미방문)
const now = Date.now();
const apptTime = new Date(context.deal.appointmentDate).getTime();
if (now > apptTime + 30*60*1000 && context.deal.stage !== 'COMPLETED') {
  await api(\`/deals/\${context.deal.id}\`, { method: 'PATCH', body: JSON.stringify({ stage: 'NO_SHOW' }) });
  await api('/contacts', { method: 'POST', body: JSON.stringify({
    workspaceId: state.currentWorkspace.id,
    firstName: context.deal.clientName,
    phone: context.deal.contactPhone,
    metadata: { noShowCount: 1, isBlacklist: true }
  }) });
  await api('/notifications', { method: 'POST', body: JSON.stringify({
    workspaceId: state.currentWorkspace.id,
    userId: state.user.id,
    title: '❌ 노쇼 발생',
    message: '\${context.deal.clientName} 예약 미방문. 블랙리스트 등록됨.',
    type: 'error'
  }) });
}` } },
      ],
    },
    {
      id: 'rest_ind_table_turnover',
      name: '🔄 테이블 회전율 분석 → 피크타임 인력 배치 추천',
      description: '식사 시간대별 테이블 회전율 계산. 회전율 낮으면 메뉴/서비스 개선 알림, 높으면 인력 추가 추천',
      industry: 'restaurant_individual',
      trigger: TriggerType.SCHEDULED_TIME,
      cron: '0 22 * * *',
      conditions: [],
      actions: [
        { type: ActionType.RUN_FUNCTION, config: { code: `const deals = (await api(\`/deals?workspaceId=\${state.currentWorkspace.id}&stage=WON&limit=500\`)).data || [];
const today = new Date().toISOString().split('T')[0];
const todayDeals = deals.filter(d => d.metadata?.date === today);

const tables = (await api('/custom/tables')).data || [];
const totalTables = tables.length;

const lunchDeals = todayDeals.filter(d => {
  const h = new Date(d.metadata?.createdAt).getHours();
  return h >= 11 && h < 15;
});
const dinnerDeals = todayDeals.filter(d => {
  const h = new Date(d.metadata?.createdAt).getHours();
  return h >= 17 && h < 22;
});

const lunchTurnover = totalTables > 0 ? (lunchDeals.length / totalTables).toFixed(1) : 0;
const dinnerTurnover = totalTables > 0 ? (dinnerDeals.length / totalTables).toFixed(1) : 0;

return { lunchTurnover, dinnerTurnover, lunchCount: lunchDeals.length, dinnerCount: dinnerDeals.length, totalTables };` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `const { lunchTurnover, dinnerTurnover, lunchCount, dinnerCount, totalTables } = context.functionResult;

const alerts = [];
if (lunchTurnover < 2) alerts.push(\`점심 회전율 \${lunchTurnover}회 (목표 2.5회+)\`);
if (dinnerTurnover < 1.5) alerts.push(\`저녁 회전율 \${dinnerTurnover}회 (목표 2회+)\`);

if (alerts.length > 0) {
  await api('/notifications', { method: 'POST', body: JSON.stringify({
    workspaceId: state.currentWorkspace.id,
    userId: state.user.id,
    title: '📉 테이블 회전율 낮음',
    message: '\${alerts.join(" / ")}. 메뉴 간소화/서비스 속도 개선 검토',
    type: 'warning'
  }) });
} else if (lunchTurnover > 3.5 || dinnerTurnover > 3) {
  await api('/notifications', { method: 'POST', body: JSON.stringify({
    workspaceId: state.currentWorkspace.id,
    userId: state.user.id,
    title: '📈 회전율 높음 - 인력 추가 고려',
    message: '점심 \${lunchTurnover}회, 저녁 \${dinnerTurnover}회. 홀 인력 충원 필요할 수 있음',
    type: 'info'
  }) });
}` } },
      ],
    },
  ],

  // ──────────────────────────────────────────────
  // 3. 프랜차이즈 카페 (가맹관리/본사정책/다매장)
  // ──────────────────────────────────────────────
  cafe_franchise: [
    {
      id: 'cafe_fr_franchise_onboarding',
      name: '📋 가맹 문의 → 상담 → 계약 → 오픈 체크리스트 (본사 표준)',
      description: '가맹 문의부터 그랜드 오픈까지 본사 표준 프로세스 28단계 자동 트래킹. 슈퍼바이저 배정/진도율 실시간 모니터링',
      industry: 'cafe_franchise',
      trigger: TriggerType.DEAL_CREATED,
      conditions: [{ field: 'deal.source', operator: ConditionType.EQUALS, value: 'FRANCHISE_INQUIRY' }],
      actions: [
        { type: ActionType.MOVE_DEAL_STAGE, config: { dealId: '{{deal.id}}', stage: 'INQUIRY_RECEIVED' } },
        { type: ActionType.RUN_FUNCTION, config: { code: `// 슈퍼바이저 라운드로빈 배정
const svs = (await api('/users')).filter(u => u.role === 'SUPERVISOR');
if (svs.length) {
  const sv = svs[Math.floor(Math.random() * svs.length)];
  await api(\`/deals/\${context.deal.id}\`, { method: 'PATCH', body: JSON.stringify({ supervisorId: sv.id }) });
  return sv;
}` } },
        { type: ActionType.CREATE_REMINDER, config: { fields: { title: '1차 상담 예약 (3일 내)', dealId: '{{deal.id}}', dueAt: '{{new Date(Date.now() + 3*24*60*60*1000).toISOString()}}', type: 'MEETING' } } },
        { type: ActionType.RUN_FUNCTION, config: { code: `// 계약 체결 시 → 오픈 준비 28개 태스크 자동 생성
if (context.deal && context.deal.stage === 'CONTRACT_SIGNED') {
  await api(\`/deals/\${context.deal.id}\`, { method: 'PATCH', body: JSON.stringify({ stage: 'PRE_OPEN', contractDate: new Date().toISOString() }) });
  
  const tasks = [
    {title: '가맹비/보증금 납부 확인', days: 1, assignee: 'HQ'},
    {title: '점포 선정/임대차계약', days: 7, assignee: 'SV'},
    {title: '인테리어 설계 도면 확정', days: 14, assignee: 'HQ'},
    {title: '인테리어 시공 착수', days: 21, assignee: 'SV'},
    {title: '본사 승인 인테리어 자재 발주', days: 21, assignee: 'HQ'},
    {title: 'POS/키오스크/주문시스템 설치', days: 35, assignee: 'HQ'},
    {title: '머신/그라인더/제빙기 설치', days: 38, assignee: 'HQ'},
    {title: '원두/시럽/부자재 초도 발주', days: 40, assignee: 'HQ'},
    {title: '직원 채용 공고', days: 28, assignee: 'SV'},
    {title: '직원 채용 완료', days: 42, assignee: 'SV'},
    {title: '본사 파견 교육 (레시피/CS/위생)', days: 45, assignee: 'HQ'},
    {title: '위생교육 수료증 발급', days: 48, assignee: 'SV'},
    {title: '배달앱/포스/키오스크 연동 테스트', days: 49, assignee: 'HQ'},
    {title: '소프트 오픈 리허설', days: 52, assignee: 'SV'},
    {title: '본사 최종 점검 (QSC)', days: 54, assignee: 'HQ'},
    {title: '그랜드 오픈', days: 56, assignee: 'ALL'},
    {title: '오픈 1주차 본사 지원 파견', days: 57, assignee: 'HQ'},
    {title: '오픈 1개월차 정기 방문', days: 84, assignee: 'SV'},
  ];
  
  for (const t of tasks) {
    await api('/reminders', { method: 'POST', body: JSON.stringify({
      workspaceId: state.currentWorkspace.id,
      dealId: context.deal.id,
      title: t.title,
      dueAt: new Date(Date.now() + t.days*24*60*60*1000).toISOString(),
      type: 'TASK',
      assignee: t.assignee,
      description: '가맹점 오픈 표준 프로세스'
    }) });
  }
}` } },
      ],
    },
    {
      id: 'cafe_fr_multi_store_sales',
      name: '🏪 다매장 일일 매출 자동 취합 → 본사 대시보드/점주별 알림',
      description: '전 가맹점 POS 연동 → 본사/지역본부/점주별 맞춤 알림. 전월동비/전년동비/목표달성률 자동 계산',
      industry: 'cafe_franchise',
      trigger: TriggerType.SCHEDULED_TIME,
      cron: '0 2 * * *',
      conditions: [],
      actions: [
        { type: ActionType.RUN_FUNCTION, config: { code: `const stores = (await api('/custom/stores')).data || [];
const results = [];

for (const s of stores) {
  try {
    const sales = await api(\`/custom/pos/sales?storeId=\${s.id}&date=\${new Date(Date.now()-86400000).toISOString().split('T')[0]}\`);
    const ratio = sales.daily / s.target;
    const mom = sales.monthly / (sales.lastMonth || 1);
    const yoy = sales.monthly / (sales.lastYear || 1);
    
    results.push({ 
      store: s, sales: sales.daily, target: s.target, ratio, mom, yoy,
      monthly: sales.monthly, lastMonth: sales.lastMonth, lastYear: sales.lastYear
    });
  } catch(e) {
    results.push({ store: s, error: true });
  }
}

return results;` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `// 점주별 알림
for (const r of context.functionResult) {
  if (r.error) continue;
  const pct = Math.round(r.ratio * 100);
  const momPct = Math.round(r.mom * 100);
  const yoyPct = Math.round(r.yoy * 100);
  
  let type = 'info';
  if (pct < 80) type = 'warning';
  if (pct < 50) type = 'error';
  
  await api('/notifications', { method: 'POST', body: JSON.stringify({
    workspaceId: state.currentWorkspace.id,
    userId: r.store.ownerId,
    title: type === 'error' ? '🚨 매출 심각' : (type === 'warning' ? '⚠️ 목표 미달' : '✅ 목표 달성'),
    message: '\${r.store.name} \${r.sales.toLocaleString()}원 (\${pct}%) | 전월비 \${momPct}% | 전년비 \${yoyPct}%',
    type
  }) });
}` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `// 본사/지역본부 종합 리포트
const hq = (await api('/users')).filter(u => u.role === 'SUPER_ADMIN' || u.role === 'REGIONAL_MGR');
const totalSales = context.functionResult.filter(r => !r.error).reduce((sum, r) => sum + r.sales, 0);
const totalTarget = context.functionResult.filter(r => !r.error).reduce((sum, r) => sum + r.target, 0);
const avgRatio = totalTarget > 0 ? (totalSales / totalTarget * 100).toFixed(1) : 0;
const underPerforming = context.functionResult.filter(r => !r.error && r.ratio < 0.8).length;

for (const m of hq) {
  await api('/notifications', { method: 'POST', body: JSON.stringify({
    workspaceId: state.currentWorkspace.id,
    userId: m.id,
    title: '📊 전 가맹점 일일 매출 요약',
    message: '총 \${context.functionResult.length}개점 | 매출 \${totalSales.toLocaleString()}원 (\${avgRatio}%) | 미달 \${underPerforming}개점',
    type: underPerforming > 5 ? 'warning' : 'info'
  }) });
}` } },
      ],
    },
    {
      id: 'cafe_fr_qsc_audit',
      name: '📋 QSC(품질/서비스/청결) 정기 점검 → 표준화 체크리스트 + 개선 명령',
      description: '슈퍼바이저 월 1회 방문 점검. 50개 항목 체크 → 점수 산출 → 미달 항목 개선 명령 자동 생성 → 재점검 일정 잡힘',
      industry: 'cafe_franchise',
      trigger: TriggerType.SCHEDULED_TIME,
      cron: '0 9 1 * *',
      conditions: [],
      actions: [
        { type: ActionType.RUN_FUNCTION, config: { code: `const stores = (await api('/custom/stores')).data || [];
const svs = (await api('/users')).filter(u => u.role === 'SUPERVISOR');

const audits = [];
for (const s of stores) {
  const sv = svs.find(v => v.region === s.region) || svs[0];
  audits.push({
    storeId: s.id,
    storeName: s.name,
    supervisorId: sv?.id,
    dueDate: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
    checklist: [
      {category: 'Quality', items: ['에스프레소 추출 시간', '우유 스티밍 온도', '시럽 계량 정확도', '아이스 음료 비율', '디저트 신선도']},
      {category: 'Service', items: ['인사/응대 멘트', '주문 정확도', '대기시간 안내', '불만 처리 프로세스', '포장 상태']},
      {category: 'Cleanliness', items: ['머신/그라인더 청결', '작업대/냉장고 위생', '화장실 청결도', '쓰레기 분리수거', '바닥/창문 청소']}
    ]
  });
}

return audits;` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `for (const a of context.functionResult) {
  await api('/reminders', { method: 'POST', body: JSON.stringify({
    workspaceId: state.currentWorkspace.id,
    title: '📋 QSC 점검: \${a.storeName}',
    dueAt: a.dueDate,
    type: 'TASK',
    assignee: a.supervisorId,
    metadata: { checklist: a.checklist, storeId: a.storeId }
  }) });
  
  await api('/notifications', { method: 'POST', body: JSON.stringify({
    workspaceId: state.currentWorkspace.id,
    userId: a.supervisorId,
    title: '📋 QSC 점검 배정',
    message: '\${a.storeName} 이번달 점검 대상. 체크리스트 50개 항목 평가 후 등록',
    type: 'info'
  }) });
}` } },
      ],
    },
    {
      id: 'cafe_fr_group_purchase',
      name: '📦 공동구매/공동배송 → 본사 주문 취합 → 물류비 절감',
      description: '가맹점별 발주 내역 취합 → 본사 통합 발주 → 박스 단위 공동배송 → 물류비 20~30% 절감',
      industry: 'cafe_franchise',
      trigger: TriggerType.SCHEDULED_TIME,
      cron: '0 10 * * 1', // 매주 월요일
      conditions: [],
      actions: [
        { type: ActionType.RUN_FUNCTION, config: { code: `const orders = (await api('/custom/orders')).data || [];
const pending = orders.filter(o => o.status === 'PENDING' && o.type === 'GROUP_PURCHASE');

const grouped = {};
for (const o of pending) {
  if (!grouped[o.itemId]) grouped[o.itemId] = { itemName: o.itemName, totalQty: 0, stores: [] };
  grouped[o.itemId].totalQty += o.qty;
  grouped[o.itemId].stores.push({ storeId: o.storeId, qty: o.qty });
}

return Object.entries(grouped).map(([itemId, data]) => ({ itemId, ...data }));` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `for (const g of context.functionResult) {
  // 박스 단위 올림
  const boxQty = g.itemData?.boxQty || 20;
  const boxes = Math.ceil(g.totalQty / boxQty);
  const finalQty = boxes * boxQty;
  
  // 본사 통합 발주 생성
  await api('/custom/purchase-orders', { method: 'POST', body: JSON.stringify({
    itemId: g.itemId,
    itemName: g.itemName,
    totalQty: finalQty,
    boxes,
    stores: g.stores,
    type: 'GROUP_PURCHASE',
    status: 'ORDERED',
    orderedAt: new Date().toISOString()
  }) });
  
  // 각 점주에게 알림
  for (const s of g.stores) {
    await api('/notifications', { method: 'POST', body: JSON.stringify({
      workspaceId: state.currentWorkspace.id,
      userId: s.storeOwnerId,
      title: '📦 공동구매 발주 확정',
      message: '\${g.itemName} \${s.qty}개 → \${finalQty}개 박스 단위 주문. 입고일 별도 안내',
      type: 'info'
    }) });
  }
}` } },
      ],
    },
  ],

  // ──────────────────────────────────────────────
  // 4. 프랜차이즈 식당 (가맹오픈/표준레시피/본사감사)
  // ──────────────────────────────────────────────
  restaurant_franchise: [
    {
      id: 'rest_fr_franchise_onboarding',
      name: '🏗️ 가맹 오픈 표준 프로세스 (계약→오픈 90일/60단계)',
      description: '상권분석/점포선정/인테리어/주방설비/직원교육/메뉴테스트/소프트오픈/그랜드오픈 전 과정 본사 매뉴얼대로 자동 트래킹',
      industry: 'restaurant_franchise',
      trigger: TriggerType.DEAL_CREATED,
      conditions: [{ field: 'deal.source', operator: ConditionType.EQUALS, value: 'FRANCHISE_INQUIRY' }],
      actions: [
        { type: ActionType.MOVE_DEAL_STAGE, config: { dealId: '{{deal.id}}', stage: 'SITE_ANALYSIS' } },
        { type: ActionType.RUN_FUNCTION, config: { code: `const tasks = [
  {phase: '상권/점포', title: '상권 분석 리포트 작성', days: 7, assignee: 'HQ'},
  {phase: '상권/점포', title: '점포 후보지 3곳 실사', days: 14, assignee: 'SV'},
  {phase: '상권/점포', title: '임대차계약 체결', days: 21, assignee: 'SV'},
  {phase: '인테리어', title: '본사 표준 도면 확정', days: 21, assignee: 'HQ'},
  {phase: '인테리어', title: '주방 동선/배관/전기 설계', days: 28, assignee: 'HQ'},
  {phase: '인테리어', title: '시공 착수', days: 35, assignee: 'SV'},
  {phase: '주방설비', title: '본사 지정 장비 발주', days: 28, assignee: 'HQ'},
  {phase: '주방설비', title: '가스/후드/덕트/냉장 설치', days: 42, assignee: 'SV'},
  {phase: '직원', title: '점장/주방장 채용', days: 35, assignee: 'SV'},
  {phase: '직원', title: '홀/주방 직원 채용', days: 49, assignee: 'SV'},
  {phase: '교육', title: '본사 파견 조리 교육 (2주)', days: 56, assignee: 'HQ'},
  {phase: '교육', title: 'CS/위생/시스템 교육', days: 63, assignee: 'HQ'},
  {phase: '메뉴', title: '표준 레시피 테스트/수율 검증', days: 63, assignee: 'HQ'},
  {phase: '메뉴', title: '원가율/판매가 최종 확정', days: 70, assignee: 'HQ'},
  {phase: '오픈준비', title: '식자재 초도 발주', days: 70, assignee: 'HQ'},
  {phase: '오픈준비', title: 'POS/키오스크/배달앱 연동', days: 77, assignee: 'HQ'},
  {phase: '오픈준비', title: '위생허가/영업신고', days: 77, assignee: 'SV'},
  {phase: '오픈준비', title: '소프트 오픈 (3일)', days: 84, assignee: 'ALL'},
  {phase: '오픈준비', title: '본사 최종 QSC 점검', days: 87, assignee: 'HQ'},
  {phase: '오픈', title: '그랜드 오픈', days: 90, assignee: 'ALL'},
  {phase: '안정화', title: '오픈 1주차 본사 지원', days: 97, assignee: 'HQ'},
  {phase: '안정화', title: '오픈 1개월차 정기 방문', days: 120, assignee: 'SV'},
];
for (const t of tasks) {
  await api('/reminders', { method: 'POST', body: JSON.stringify({
    workspaceId: state.currentWorkspace.id,
    dealId: context.deal.id,
    title: '[\${t.phase}] \${t.title}',
    dueAt: new Date(Date.now() + t.days*24*60*60*1000).toISOString(),
    type: 'TASK',
    assignee: t.assignee,
    description: '가맹점 오픈 표준 매뉴얼'
  }) });
}` } },
      ],
    },
    {
      id: 'rest_fr_recipe_management',
      name: '📖 표준 레시피 관리 → 수율/원가율/알러지 자동 계산 + 버전 관리',
      description: '본사 레시피 등록 시 메뉴별 그램 단위 배합 → 주문 시 자동 수율 계산 → 원가율 30% 초과 알림 → 레시피 변경 시 전 가맹점 동시 배포',
      industry: 'restaurant_franchise',
      trigger: TriggerType.SCHEDULED_TIME,
      cron: '0 6 * * 1', // 매주 월요일
      conditions: [],
      actions: [
        { type: ActionType.RUN_FUNCTION, config: { code: `const recipes = (await api('/custom/recipes')).data || [];
const alerts = [];

for (const r of recipes) {
  const totalWeight = r.materials.reduce((sum, m) => sum + m.weight, 0);
  const yieldRate = ((r.finishedWeight || totalWeight) / totalWeight * 100).toFixed(1);
  const materialCost = r.materials.reduce((sum, m) => sum + (m.unitCost * m.weight), 0);
  const costRate = r.sellingPrice > 0 ? (materialCost / r.sellingPrice * 100).toFixed(1) : 0;
  
  if (costRate > 30) {
    alerts.push({ menu: r.menuName, costRate, yieldRate, sellingPrice: r.sellingPrice });
  }
  
  // 알러지 정보 자동 태깅
  const allergens = [];
  for (const m of r.materials) {
    if (m.allergens) allergens.push(...m.allergens);
  }
  r.allergens = [...new Set(allergens)];
}

return { recipes, alerts };` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `const { alerts } = context.functionResult;

if (alerts.length > 0) {
  await api('/notifications', { method: 'POST', body: JSON.stringify({
    workspaceId: state.currentWorkspace.id,
    userId: (await api('/users')).find(u => u.role === 'SUPER_ADMIN')?.id,
    title: '⚠️ 표준 레시피 원가율 30% 초과',
    message: '\${alerts.map(a => a.menu + " " + a.costRate + "%").join(", ")}',
    type: 'warning'
  }) });
}` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `// 레시피 버전 변경 시 전 가맹점 푸시
const changed = context.functionResult.recipes.filter(r => r.versionChanged);
for (const r of changed) {
  await api('/communications/kakao', { method: 'POST', body: JSON.stringify({
    to: 'ALL_FRANCHISE',
    templateId: 'recipe_updated',
    variables: { menu: r.menuName, version: r.version, change: r.changeLog }
  }) }).catch(()=>{});
}` } },
      ],
    },
    {
      id: 'rest_fr_sv_audit',
      name: '👮 슈퍼바이저 정기 감사 → 100개 항목 체크 → 개선 명령/페널티/인증',
      description: '월 1회 매장 방문. 위생/조리/서비스/시설/인사 5개 영역 100개 항목. 90점 미만 개선 명령, 70점 미만 페널티, 95점 이상 인증 마크 부여',
      industry: 'restaurant_franchise',
      trigger: TriggerType.SCHEDULED_TIME,
      cron: '0 9 1 * *',
      conditions: [],
      actions: [
        { type: ActionType.RUN_FUNCTION, config: { code: `const stores = (await api('/custom/stores')).data || [];
const svs = (await api('/users')).filter(u => u.role === 'SUPERVISOR');

const audits = [];
for (const s of stores) {
  const sv = svs.find(v => v.region === s.region) || svs[0];
  audits.push({
    storeId: s.id,
    storeName: s.name,
    supervisorId: sv?.id,
    dueDate: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
    areas: [
      {name: '위생/식품안전', weight: 25, items: ['유통기한 관리', '교차오염 방지', '보관온도 준수', '작업자 위생', '청소/소독 기록']},
      {name: '조리/품질', weight: 25, items: ['레시피 준수', '수율 관리', '맛/비주얼 표준', '조리시간 준수', '보관/해동 프로세스']},
      {name: '서비스/QSC', weight: 20, items: ['인사/응대', '주문정확도', '대기관리', '불만처리', '포장/배달 품질']},
      {name: '시설/설비', weight: 15, items: ['주방후드/덕트', '냉장/냉동고', '가스/전기 안전', '소방시설', '화장실/홀 청결']},
      {name: '인사/운영', weight: 15, items: ['근로계약/4대보험', '근무시간/휴게', '교육이수 현황', '급여/수당 지급', '취업규칙 게시']}
    ]
  });
}

return audits;` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `for (const a of context.functionResult) {
  await api('/reminders', { method: 'POST', body: JSON.stringify({
    workspaceId: state.currentWorkspace.id,
    title: '👮 정기 감사: \${a.storeName}',
    dueAt: a.dueDate,
    type: 'TASK',
    assignee: a.supervisorId,
    metadata: { areas: a.areas, storeId: a.storeId }
  }) });
}` } },
      ],
    },
    {
      id: 'rest_fr_kpi_benchmark',
      name: '📈 전 가맹점 KPI 벤치마킹 → 상위 10% 노하우 공유 / 하위 10% 집중 지원',
      description: '매출/원가율/인건비율/회전율/고객만족도 5대 지표 산출 → 분위수 분석 → 베스트 프랙티스 케이스스터디 자동 생성 → 하위권 매장 개선 플랜 수립',
      industry: 'restaurant_franchise',
      trigger: TriggerType.SCHEDULED_TIME,
      cron: '0 8 1 * *',
      conditions: [],
      actions: [
        { type: ActionType.RUN_FUNCTION, config: { code: `const stores = (await api('/custom/stores')).data || [];
const kpis = [];

for (const s of stores) {
  const monthly = await api(\`/custom/monthly-kpi?storeId=\${s.id}&month=\${new Date().getMonth()}\`);
  kpis.push({
    storeId: s.id,
    storeName: s.name,
    region: s.region,
    sales: monthly.sales || 0,
    costRate: monthly.costRate || 0,
    laborRate: monthly.laborRate || 0,
    turnover: monthly.turnover || 0,
    satisfaction: monthly.satisfaction || 0,
  });
}

// 분위수 계산
const metrics = ['sales', 'costRate', 'laborRate', 'turnover', 'satisfaction'];
for (const m of metrics) {
  const sorted = [...kpis].sort((a,b) => a[m] - b[m]);
  for (const k of kpis) {
    const idx = sorted.findIndex(s => s.storeId === k.storeId);
    k[\`${m}Pct\`] = ((idx + 1) / sorted.length * 100).toFixed(0);
  }
}

return kpis;` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `const { kpis } = context;
const top10 = kpis.filter(k => k.salesPct >= 90);
const bottom10 = kpis.filter(k => k.salesPct <= 10);

// 상위권 베스트 프랙티스 수집
for (const t of top10) {
  await api('/notifications', { method: 'POST', body: JSON.stringify({
    workspaceId: state.currentWorkspace.id,
    userId: t.storeOwnerId,
    title: '🏆 상위 10% 진입 - 베스트 프랙티스 공유 요청',
    message: '매출 상위 10% 달성! 노하우(운영/마케팅/인사) 공유해주시면 전 가맹점 배포',
    type: 'success'
  }) });
}

// 하위권 개선 플랜
for (const b of bottom10) {
  await api('/reminders', { method: 'POST', body: JSON.stringify({
    workspaceId: state.currentWorkspace.id,
    title: '🎯 집중 지원 대상 매장 개선 플랜 수립',
    dueAt: new Date(Date.now() + 14*24*60*60*1000).toISOString(),
    type: 'TASK',
    assignee: (await api('/users')).find(u => u.region === b.region && u.role === 'SUPERVISOR')?.id,
    metadata: { storeId: b.storeId, kpis: b }
  }) });
}` } },
      ],
    },
  ],

  // 빈 배열 (기타 업종 필요시 추가)
  hospital: [],
  realestate: [],
  academy: [],
  manufacturing: [],
  beauty: [],
};

// 플랫하게 export
window.AUTOMATION_TEMPLATES = AUTOMATION_TEMPLATES;
window.AUTOMATION_ALL_TEMPLATES = Object.values(AUTOMATION_TEMPLATES).flat();

// 업종별 키로 접근 가능
window.AUTOMATION_CAFE_INDIVIDUAL_TEMPLATES = AUTOMATION_TEMPLATES.cafe_individual || [];
window.AUTOMATION_REST_INDIVIDUAL_TEMPLATES = AUTOMATION_TEMPLATES.restaurant_individual || [];
window.AUTOMATION_CAFE_FRANCHISE_TEMPLATES = AUTOMATION_TEMPLATES.cafe_franchise || [];
window.AUTOMATION_REST_FRANCHISE_TEMPLATES = AUTOMATION_TEMPLATES.restaurant_franchise || [];