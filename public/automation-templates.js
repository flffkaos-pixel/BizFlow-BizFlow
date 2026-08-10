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
      name: '📋 신규 리드 → 딜 자동 생성 + 담당자 배정',
      description: '웹훅/폼으로 리드 들어오면 딜 만들고 라운드로빈으로 담당자 배정',
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
      name: '⏰ 딜 정체 감지 → 자동 알림 + 에스컬레이션',
      description: '같은 스테이지에서 N일 정체 시 알림, 더 지나면 상위 관리자 에스컬레이션',
      trigger: TriggerType.SCHEDULED_TIME,
      cron: '0 9 * * *', // 매일 오전 9시
      conditions: [],
      actions: [
        { type: ActionType.RUN_FUNCTION, config: { code: `const deals = (await api(\`/deals?workspaceId=\${state.currentWorkspace.id}&limit=1000\`)).data || []; const stuck = deals.filter(d => !['WON','LOST'].includes(d.stage) && d.updatedAt && (Date.now() - new Date(d.updatedAt).getTime()) > 7*24*60*60*1000); return stuck;` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `for (const d of context.functionResult) { await api(\`/notifications\`, { method: 'POST', body: JSON.stringify({ workspaceId: state.currentWorkspace.id, userId: d.assignedTo || state.user.id, title: '딜 정체 알림', message: '\${d.title}이(가) 7일째 \${d.stage} 단계에 머물러 있습니다.', type: 'warning' }) }); if ((Date.now() - new Date(d.updatedAt).getTime()) > 14*24*60*60*1000) { const admin = (await api('/users')).find(u => u.role === 'SUPER_ADMIN'); if (admin) await api(\`/notifications\`, { method: 'POST', body: JSON.stringify({ workspaceId: state.currentWorkspace.id, userId: admin.id, title: '에스컬레이션: 장기 정체 딜', message: '\${d.title} 14일 정체 - 관리자 검토 필요', type: 'error' }) }); } }` } },
      ],
    },
    {
      name: '💰 결제 완료 → 계약 단계 이동 + 계약서 발송 + 웰컴 온보딩',
      description: '결제 웹훅 수신 시 딜을 계약 단계로, 계약서 생성/발송, 온보딩 리마인더 생성',
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
    {
      name: '📉 결제 실패 → 자동 재시도 알림 + 딜 홀드',
      description: '결제 실패 시 딜을 PAYMENT_PENDING으로, 고객/담당자 알림, 3일 후 재시도',
      trigger: TriggerType.PAYMENT_FAILED,
      conditions: [],
      actions: [
        { type: ActionType.RUN_FUNCTION, config: { code: `const deal = await api(\`/deals?workspaceId=\${state.currentWorkspace.id}&metadata_paymentId=\${context.payload.paymentId}\`); return deal.data?.[0] || deal.find(d => d.metadata?.paymentId === context.payload.paymentId);` } },
        { type: ActionType.MOVE_DEAL_STAGE, config: { dealId: '{{functionResult.id}}', stage: 'PAYMENT_PENDING' } },
        { type: ActionType.SEND_NOTIFICATION, config: { userId: '{{functionResult.assignedTo}}', title: '결제 실패', message: '{{functionResult.title}} 결제 실패: {{payload.reason}}. 고객 연락 필요.', type: 'error' } },
        { type: ActionType.SEND_KAKAO, config: { to: '{{functionResult.contactPhone}}', templateId: 'payment_failed_retry', variables: { name: '{{functionResult.clientName}}', amount: '{{payload.amount}}', retryUrl: '{{payload.retryUrl}}' } } },
        { type: ActionType.CREATE_REMINDER, config: { fields: { title: '결제 재시도 유도 연락', dealId: '{{functionResult.id}}', dueAt: '{{new Date(Date.now() + 3*24*60*60*1000).toISOString()}}', type: 'CALL' } } },
      ],
    },
    {
      name: '🔄 계약 만료 30일 전 → 갱신 알림 + 견적서 자동 발송',
      description: '계약 종료일 기준 30/14/7/1일 전 자동 알림, 갱신 견적서 첨부',
      trigger: TriggerType.SCHEDULED_TIME,
      cron: '0 10 * * *',
      conditions: [],
      actions: [
        { type: ActionType.RUN_FUNCTION, config: { code: `const deals = (await api(\`/deals?workspaceId=\${state.currentWorkspace.id}&limit=1000\`)).data || []; const now = Date.now(); return deals.filter(d => d.stage === 'WON' && d.contractEndAt && [30,14,7,1].includes(Math.ceil((new Date(d.contractEndAt).getTime() - now) / (1000*60*60*24)));` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `for (const d of context.functionResult) { const days = Math.ceil((new Date(d.contractEndAt).getTime() - Date.now()) / (1000*60*60*24)); await api(\`/documents/quote\`, { method: 'POST', body: JSON.stringify({ dealId: d.id, templateId: 'renewal_quote' }) }).then(q => api(\`/documents/\${q.id}/send\`, { method: 'POST', body: JSON.stringify({ to: d.contactEmail, channel: 'email' }) })); await api('/notifications', { method: 'POST', body: JSON.stringify({ workspaceId: state.currentWorkspace.id, userId: d.assignedTo || state.user.id, title: '\`계약 갱신 \${days}일 전\`', message: '\${d.clientName} 계약이 \${days}일 후 만료됩니다. 갱신 견적서 발송 완료.', type: 'info' }) }); }` } },
      ],
    },
  ],

  // ──────────────────────────────────────────────
  // 카페/외식 프랜차이즈
  // ──────────────────────────────────────────────
  cafe: [
    {
      name: '☕ 가맹 문의 → 상담 예약 → 계약 → 오픈 체크리스트 자동 생성',
      description: '가맹 문의부터 그랜드 오픈까지 전 과정 자동 트래킹',
      trigger: TriggerType.DEAL_CREATED,
      conditions: [{ field: 'deal.source', operator: ConditionType.EQUALS, value: 'FRANCHISE_INQUIRY' }],
      actions: [
        { type: ActionType.MOVE_DEAL_STAGE, config: { dealId: '{{deal.id}}', stage: 'CONSULTATION_SCHEDULED' } },
        { type: ActionType.CREATE_REMINDER, config: { fields: { title: '가맹 상담 1차', dealId: '{{deal.id}}', dueAt: '{{new Date(Date.now() + 2*24*60*60*1000).toISOString()}}', type: 'MEETING' } } },
        { type: ActionType.SEND_KAKAO, config: { to: '{{deal.contactPhone}}', templateId: 'franchise_consult_guide', variables: { name: '{{deal.clientName}}', brand: 'BizFlow Cafe' } } },
        // 계약 단계 진입 시
        { type: ActionType.RUN_FUNCTION, config: { code: `if (context.deal.stage === 'CONTRACT') { await api(\`/deals/\${context.deal.id}\`, { method: 'PATCH', body: JSON.stringify({ stage: 'PRE_OPEN' }) }); const tasks = ['임대차계약', '인테리어 시공', 'POS 설치', '메뉴 교육', '직원 채용', '위생교육', '그랜드 오픈 홍보']; for (let i=0; i<tasks.length; i++) { await api('/reminders', { method: 'POST', body: JSON.stringify({ workspaceId: state.currentWorkspace.id, dealId: context.deal.id, title: tasks[i], dueAt: new Date(Date.now() + (i+1)*7*24*60*60*1000).toISOString(), type: 'TASK' }) }); } }` } },
      ],
    },
    {
      name: '📊 일일 매출 자동 수집 → 임계치 미달 알림',
      description: 'POS 연동 시 일 매출이 목표 미달면 점주/본사 알림',
      trigger: TriggerType.SCHEDULED_TIME,
      cron: '0 2 * * *', // 새벽 2시 (전일 마감 후)
      conditions: [],
      actions: [
        { type: ActionType.RUN_FUNCTION, config: { code: `const stores = (await api('/custom/stores')).data || []; const alerts = []; for (const s of stores) { const sales = await api(\`/custom/pos/sales?storeId=\${s.id}&date=\${new Date(Date.now()-86400000).toISOString().split('T')[0]}\`); if (sales.daily < s.target * 0.8) alerts.push({ store: s, sales, ratio: sales.daily / s.target }); } return alerts;` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `for (const a of context.functionResult) { await api('/notifications', { method: 'POST', body: JSON.stringify({ workspaceId: state.currentWorkspace.id, userId: a.store.ownerId, title: '매출 경고: 목표 미달', message: '\${a.store.name} 어제 매출 \${a.sales.daily.toLocaleString()}원 (목표 \${a.store.target.toLocaleString()}원, \${Math.round(a.ratio*100)}%)', type: 'warning' }) }); if (a.ratio < 0.5) { const hq = (await api('/users')).find(u => u.role === 'SUPER_ADMIN'); await api('/notifications', { method: 'POST', body: JSON.stringify({ workspaceId: state.currentWorkspace.id, userId: hq.id, title: '긴급: 매출 50% 미만', message: '\${a.store.name} 매출 급감 - 본사 지원 필요', type: 'error' }) }); } }` } },
      ],
    },
  ],

  // ──────────────────────────────────────────────
  // 병원/의원
  // ──────────────────────────────────────────────
  hospital: [
    {
      name: '🏥 신환 예약 → 사전 문진표 발송 → 내원 리마인더 → 초진 후 재예약 유도',
      description: '환자 여정 완전 자동화',
      trigger: TriggerType.DEAL_CREATED,
      conditions: [{ field: 'deal.type', operator: ConditionType.EQUALS, value: 'NEW_PATIENT' }],
      actions: [
        { type: ActionType.SEND_KAKAO, config: { to: '{{deal.contactPhone}}', templateId: 'hospital_pre_visit', variables: { name: '{{deal.clientName}}', hospital: 'BizFlow 병원', date: '{{deal.appointmentDate}}', link: '{{deal.questionnaireUrl}}' } } },
        { type: ActionType.CREATE_REMINDER, config: { fields: { title: '내원 1시간 전 알림', dealId: '{{deal.id}}', dueAt: '{{new Date(new Date(deal.appointmentDate).getTime() - 60*60*1000).toISOString()}}', type: 'REMINDER' } } },
        { type: ActionType.RUN_FUNCTION, config: { code: `if (context.deal.stage === 'COMPLETED') { await api('/reminders', { method: 'POST', body: JSON.stringify({ workspaceId: state.currentWorkspace.id, dealId: context.deal.id, title: '재진 예약 안내', dueAt: new Date(Date.now() + 7*24*60*60*1000).toISOString(), type: 'TASK' }) }); await api('/communications/kakao', { method: 'POST', body: JSON.stringify({ to: context.deal.contactPhone, templateId: 'revisit_guide', variables: { name: context.deal.clientName, doctor: context.deal.doctorName } }) }); }` } },
      ],
    },
    {
      name: '💊 처방/시술 후 → 만족도 조사 + 리뷰 유도 + 재방문 리마인더',
      trigger: TriggerType.DEAL_STAGE_CHANGED,
      conditions: [{ field: 'newStage', operator: ConditionType.EQUALS, value: 'COMPLETED' }],
      actions: [
        { type: ActionType.DELAY, config: { ms: 86400000 } }, // 1일 후
        { type: ActionType.SEND_KAKAO, config: { to: '{{deal.contactPhone}}', templateId: 'satisfaction_survey', variables: { name: '{{deal.clientName}}', link: '{{deal.surveyUrl}}' } } },
        { type: ActionType.DELAY, config: { ms: 604800000 } }, // 7일 후
        { type: ActionType.RUN_FUNCTION, config: { code: `const survey = await api(\`/custom/survey?dealId=\${context.deal.id}\`); if (survey.score >= 4) { await api('/communications/kakao', { method: 'POST', body: JSON.stringify({ to: context.deal.contactPhone, templateId: 'review_request', variables: { name: context.deal.clientName, reviewUrl: '{{deal.reviewUrl}}' } }) }); }` } },
      ],
    },
  ],

  // ──────────────────────────────────────────────
  // 부동산
  // ──────────────────────────────────────────────
  realestate: [
    {
      name: '🏠 매물 문의 → 매칭 → 현장답사 → 계약 → 잔금/입주 체크리스트',
      trigger: TriggerType.DEAL_CREATED,
      conditions: [{ field: 'deal.source', operator: ConditionType.IN, value: ['PORTAL', 'REFERRAL', 'WALKIN'] }],
      actions: [
        { type: ActionType.RUN_FUNCTION, config: { code: `const prefs = context.deal.metadata?.preferences || {}; const matches = await api(\`/custom/properties?type=\${prefs.type}&minPrice=\${prefs.minPrice}&maxPrice=\${prefs.maxPrice}&area=\${prefs.area}\`); return matches.data?.slice(0, 5) || [];` } },
        { type: ActionType.SEND_KAKAO, config: { to: '{{deal.contactPhone}}', templateId: 'property_matches', variables: { name: '{{deal.clientName}}', count: '{{functionResult.length}}', link: '{{deal.propertyListUrl}}' } } },
        { type: ActionType.CREATE_REMINDER, config: { fields: { title: '매물 추천 후속 연락', dealId: '{{deal.id}}', dueAt: '{{new Date(Date.now() + 24*60*60*1000).toISOString()}}', type: 'CALL' } } },
        { type: ActionType.RUN_FUNCTION, config: { code: `if (context.deal.stage === 'CONTRACT_SIGNED') { await api(\`/deals/\${context.deal.id}\`, { method: 'PATCH', body: JSON.stringify({ stage: 'SETTLEMENT_PREP' }) }); const tasks = ['잔금 준비', '등기 이전', '관리비 정산', '입주 청소', '열쇠 인수']; for (let i=0; i<tasks.length; i++) { await api('/reminders', { method: 'POST', body: JSON.stringify({ workspaceId: state.currentWorkspace.id, dealId: context.deal.id, title: tasks[i], dueAt: new Date(Date.now() + (i+1)*3*24*60*60*1000).toISOString(), type: 'TASK' }) }); } }` } },
      ],
    },
  ],

  // ──────────────────────────────────────────────
  // 학원/교육
  // ──────────────────────────────────────────────
  academy: [
    {
      name: '📚 학부모 문의 → 레벨테스트 예약 → 상담 → 수강등록 → 출결/성과 트래킹',
      trigger: TriggerType.DEAL_CREATED,
      conditions: [{ field: 'deal.source', operator: ConditionType.IN, value: ['WEB', 'PHONE', 'REFERRAL'] }],
      actions: [
        { type: ActionType.SEND_KAKAO, config: { to: '{{deal.contactPhone}}', templateId: 'academy_level_test', variables: { parentName: '{{deal.clientName}}', studentName: '{{deal.metadata.studentName}}', grade: '{{deal.metadata.grade}}', link: '{{deal.bookingUrl}}' } } },
        { type: ActionType.CREATE_REMINDER, config: { fields: { title: '레벨테스트 확정 연락', dealId: '{{deal.id}}', dueAt: '{{new Date(Date.now() + 2*60*60*1000).toISOString()}}', type: 'CALL' } } },
        { type: ActionType.RUN_FUNCTION, config: { code: `if (context.deal.stage === 'ENROLLED') { await api(\`/deals/\${context.deal.id}\`, { method: 'PATCH', body: JSON.stringify({ stage: 'ACTIVE_STUDENT' }) }); const tasks = ['첫 수업 출석 확인', '1주차 피드백', '1개월차 상담', '분기별 성적 리포트']; for (let i=0; i<tasks.length; i++) { await api('/reminders', { method: 'POST', body: JSON.stringify({ workspaceId: state.currentWorkspace.id, dealId: context.deal.id, title: tasks[i], dueAt: new Date(Date.now() + [1,7,30,90][i]*24*60*60*1000).toISOString(), type: 'TASK' }) }); } }` } },
      ],
    },
    {
      name: '📅 수강 만료 14일 전 → 재등록 안내 + 할인 쿠폰 발송',
      trigger: TriggerType.SCHEDULED_TIME,
      cron: '0 10 * * *',
      conditions: [],
      actions: [
        { type: ActionType.RUN_FUNCTION, config: { code: `const deals = (await api(\`/deals?workspaceId=\${state.currentWorkspace.id}&limit=1000\`)).data || []; const now = Date.now(); return deals.filter(d => d.stage === 'ACTIVE_STUDENT' && d.courseEndAt && Math.ceil((new Date(d.courseEndAt).getTime() - now) / (1000*60*60*24)) === 14);` } },
        { type: ActionType.RUN_FUNCTION, config: { code: `for (const d of context.functionResult) { await api('/communications/kakao', { method: 'POST', body: JSON.stringify({ to: d.contactPhone, templateId: 'renewal_offer', variables: { parentName: d.clientName, studentName: d.metadata?.studentName, course: d.metadata?.courseName, discount: '10%', link: d.renewalUrl } }) }); await api('/notifications', { method: 'POST', body: JSON.stringify({ workspaceId: state.currentWorkspace.id, userId: d.assignedTo || state.user.id, title: '재등록 안내 발송', message: '\${d.metadata?.studentName} (\${d.clientName}) 수강 만료 14일 전 - 할인 쿠폰 발송 완료', type: 'info' }) }); }` } },
      ],
    },
  ],

  // ──────────────────────────────────────────────
  // 제조/B2B
  // ──────────────────────────────────────────────
  manufacturing: [
    {
      name: '🏭 RFQ(견적요청) → 자동 견적서 생성 → 승인 → 수주 → 생산일정 등록',
      trigger: TriggerType.DEAL_CREATED,
      conditions: [{ field: 'deal.type', operator: ConditionType.EQUALS, value: 'RFQ' }],
      actions: [
        { type: ActionType.GENERATE_QUOTE, config: { dealId: '{{deal.id}}', templateId: 'mfg_quote' } },
        { type: ActionType.SEND_DOCUMENT, config: { documentId: '{{generatedQuote.id}}', to: '{{deal.contactEmail}}', channel: 'email' } },
        { type: ActionType.CREATE_REMINDER, config: { fields: { title: '견적 후속 - 2일', dealId: '{{deal.id}}', dueAt: '{{new Date(Date.now() + 2*24*60*60*1000).toISOString()}}', type: 'CALL' } } },
        { type: ActionType.CREATE_REMINDER, config: { fields: { title: '견적 후속 - 1주', dealId: '{{deal.id}}', dueAt: '{{new Date(Date.now() + 7*24*60*60*1000).toISOString()}}', type: 'EMAIL' } } },
        { type: ActionType.RUN_FUNCTION, config: { code: `if (context.deal.stage === 'WON') { await api(\`/deals/\${context.deal.id}\`, { method: 'PATCH', body: JSON.stringify({ stage: 'PRODUCTION_PLANNING' }) }); const res = await api('/custom/production/schedule', { method: 'POST', body: JSON.stringify({ dealId: context.deal.id, items: context.deal.metadata?.items, priority: context.deal.metadata?.priority }) }); await api('/reminders', { method: 'POST', body: JSON.stringify({ workspaceId: state.currentWorkspace.id, dealId: context.deal.id, title: '생산 시작', dueAt: res.startDate, type: 'TASK' }) }); await api('/reminders', { method: 'POST', body: JSON.stringify({ workspaceId: state.currentWorkspace.id, dealId: context.deal.id, title: '납품 예정', dueAt: res.dueDate, type: 'TASK' }) }); }` } },
      ],
    },
  ],

  // ──────────────────────────────────────────────
  // 미용/뷰티
  // ──────────────────────────────────────────────
  beauty: [
    {
      name: '💄 신규 예약 → 사전 안내 → 시술 완료 → 리뷰/재방문 유도 + 멤버십 적립',
      trigger: TriggerType.DEAL_CREATED,
      conditions: [{ field: 'deal.type', operator: ConditionType.IN, value: ['APPOINTMENT', 'WALKIN'] }],
      actions: [
        { type: ActionType.SEND_KAKAO, config: { to: '{{deal.contactPhone}}', templateId: 'beauty_booking_confirmed', variables: { name: '{{deal.clientName}}', shop: 'BizFlow Beauty', date: '{{deal.appointmentDate}}', menu: '{{deal.metadata.menuName}}', designer: '{{deal.metadata.designerName}}' } } },
        { type: ActionType.CREATE_REMINDER, config: { fields: { title: '예약 1시간 전 리마인드', dealId: '{{deal.id}}', dueAt: '{{new Date(new Date(deal.appointmentDate).getTime() - 60*60*1000).toISOString()}}', type: 'REMINDER' } } },
        { type: ActionType.RUN_FUNCTION, config: { code: `if (context.deal.stage === 'COMPLETED') { const points = Math.floor((context.deal.value || 0) * 0.05); await api(\`/custom/membership/add-points\`, { method: 'POST', body: JSON.stringify({ customerId: context.deal.metadata?.customerId, points, dealId: context.deal.id }) }); await api('/communications/kakao', { method: 'POST', body: JSON.stringify({ to: context.deal.contactPhone, templateId: 'beauty_post_visit', variables: { name: context.deal.clientName, points, reviewUrl: context.deal.reviewUrl } }) }); await api('/reminders', { method: 'POST', body: JSON.stringify({ workspaceId: state.currentWorkspace.id, dealId: context.deal.id, title: '재방문 유도 (4주)', dueAt: new Date(Date.now() + 28*24*60*60*1000).toISOString(), type: 'TASK' }) }); }` } },
      ],
    },
  ],
};

// 플랫하게 export (업종별 키로 접근 가능)
window.AUTOMATION_TEMPLATES = AUTOMATION_TEMPLATES;

// 편의: 전체 템플릿 리스트
window.AUTOMATION_ALL_TEMPLATES = Object.values(AUTOMATION_TEMPLATES).flat();