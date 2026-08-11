/**
 * BizFlow Cafe Demo Seeder
 * 개인카페 데모용 샘플 데이터 일괄 생성
 * public/demo-seeder.js
 */

const DEMO_SEEDER = (() => {
  // ──────────────────────────────────────────────
  // 샘플 데이터 정의
  // ──────────────────────────────────────────────
  const sampleStaff = [
    { name: '김바리스', role: '매니저', phone: '010-1111-2222', color: '#3B82F6' },
    { name: '이커피', role: '바리스타', phone: '010-2222-3333', color: '#10B981' },
    { name: '박라떼', role: '바리스타', phone: '010-3333-4444', color: '#F59E0B' },
    { name: '최에스프', role: '알바', phone: '010-4444-5555', color: '#EF4444' },
  ];

  const sampleInventory = [
    { name: '원두 (블렌드 1kg)', category: '원두', currentQty: 3, safetyQty: 5, maxQty: 20, unit: '봉', supplier: '본사 원두팀', isActive: true },
    { name: '원두 (싱글오리진 500g)', category: '원두', currentQty: 8, safetyQty: 5, maxQty: 15, unit: '봉', supplier: '본사 원두팀', isActive: true },
    { name: '바닐라 시럽 1L', category: '시럽', currentQty: 2, safetyQty: 3, maxQty: 10, unit: '병', supplier: '시럽코리아', isActive: true },
    { name: '카라멜 시럽 1L', category: '시럽', currentQty: 4, safetyQty: 3, maxQty: 10, unit: '병', supplier: '시럽코리아', isActive: true },
    { name: '헤이즐넛 시럽 1L', category: '시럽', currentQty: 1, safetyQty: 2, maxQty: 8, unit: '병', supplier: '시럽코리아', isActive: true },
    { name: '우유 (서울우유 1L)', category: '유제품', currentQty: 12, safetyQty: 10, maxQty: 40, unit: '팩', supplier: '매일유업', isActive: true },
    { name: '오트밀크 1L', category: '유제품', currentQty: 3, safetyQty: 5, maxQty: 20, unit: '팩', supplier: '오틀리코리아', isActive: true },
    { name: '종이컵 (12oz 1000개)', category: '소모품', currentQty: 1, safetyQty: 2, maxQty: 5, unit: '박스', supplier: '패키지몰', isActive: true },
    { name: '빨대 (종이 2000개)', category: '소모품', currentQty: 0, safetyQty: 1, maxQty: 3, unit: '박스', supplier: '패키지몰', isActive: true },
    { name: '컵홀더 (1000개)', category: '소모품', currentQty: 4, safetyQty: 2, maxQty: 10, unit: '박스', supplier: '패키지몰', isActive: true },
    { name: '디저트 (크로플 30개)', category: '디저트', currentQty: 8, safetyQty: 10, maxQty: 50, unit: '개', supplier: '베이커리파트너', isActive: true },
    { name: '디저트 (마카롱 20개)', category: '디저트', currentQty: 5, safetyQty: 8, maxQty: 30, unit: '개', supplier: '베이커리파트너', isActive: true },
  ];

  const sampleEquipments = [
    { name: '에스프레소 머신 (라마르조꼬)', category: '머신', lastCheck: '2025-01-15', cycleDays: 30, responsible: '김바리스', notes: '헤드 가스켓 교체 주기 6개월' },
    { name: '그라인더 (마할코닉 EK43)', category: '그라인더', lastCheck: '2025-01-20', cycleDays: 7, responsible: '이커피', notes: '날 교체 500kg마다' },
    { name: '제빙기 (호시자키)', category: '제빙기', lastCheck: '2025-01-10', cycleDays: 15, responsible: '박라떼', notes: '필터 교체 월 1회' },
    { name: '정수기 (쿠쿠)', category: '정수기', lastCheck: '2024-10-15', cycleDays: 90, responsible: '최에스프', notes: '필터 교체 분기마다' },
    { name: '오븐 (컨벡션)', category: '오븐', lastCheck: '2025-01-05', cycleDays: 30, responsible: '김바리스', notes: '내부 청소 주 1회' },
  ];

  const sampleCustomers = [
    { name: '박단골', phone: '010-1111-0001', email: 'park@example.com', visitCount: 23, totalSpent: 345000, birthday: '1990-03-15', lastVisit: '2025-01-18', favoriteMenu: '아메리카노' },
    { name: '이충성', phone: '010-1111-0002', email: 'lee@example.com', visitCount: 18, totalSpent: 278000, birthday: '1985-07-22', lastVisit: '2025-01-19', favoriteMenu: '바닐라 라떼' },
    { name: '김단골이', phone: '010-1111-0003', email: 'kim@example.com', visitCount: 15, totalSpent: 210000, birthday: '1992-11-08', lastVisit: '2025-01-17', favoriteMenu: '카라멜 마키아또' },
    { name: '정주단', phone: '010-1111-0004', email: 'jung@example.com', visitCount: 12, totalSpent: 189000, birthday: '1988-05-30', lastVisit: '2025-01-16', favoriteMenu: '오트 라떼' },
    { name: '최애정', phone: '010-1111-0005', email: 'choi@example.com', visitCount: 9, totalSpent: 145000, birthday: '1995-09-12', lastVisit: '2025-01-15', favoriteMenu: '디카페인 아메리카노' },
    { name: '한번더', phone: '010-1111-0006', email: 'han@example.com', visitCount: 8, totalSpent: 112000, birthday: '1993-01-25', lastVisit: '2025-01-14', favoriteMenu: '헤이즐넛 라떼' },
    { name: '커피사랑', phone: '010-1111-0007', email: 'coffee@example.com', visitCount: 7, totalSpent: 98000, birthday: '1987-12-03', lastVisit: '2025-01-13', favoriteMenu: '플랫 화이트' },
    { name: '매일커피', phone: '010-1111-0008', email: 'daily@example.com', visitCount: 6, totalSpent: 87000, birthday: '1991-04-18', lastVisit: '2025-01-12', favoriteMenu: '콜드브루' },
    { name: '라떼좋아', phone: '010-1111-0009', email: 'latte@example.com', visitCount: 5, totalSpent: 72000, birthday: '1994-08-07', lastVisit: '2025-01-11', favoriteMenu: '연유 라떼' },
    { name: '아아만마셔', phone: '010-1111-0010', email: 'aa@example.com', visitCount: 4, totalSpent: 55000, birthday: '1989-06-21', lastVisit: '2025-01-10', favoriteMenu: '아이스 아메리카노' },
    { name: '신규고객1', phone: '010-1111-0011', email: 'new1@example.com', visitCount: 3, totalSpent: 42000, birthday: '1996-02-14', lastVisit: '2025-01-09', favoriteMenu: '딸기 라떼' },
    { name: '신규고객2', phone: '010-1111-0012', email: 'new2@example.com', visitCount: 2, totalSpent: 28000, birthday: '1997-10-31', lastVisit: '2025-01-08', favoriteMenu: '초코 라떼' },
    { name: '신규고객3', phone: '010-1111-0013', email: 'new3@example.com', visitCount: 1, totalSpent: 15000, birthday: '1998-12-25', lastVisit: '2025-01-07', favoriteMenu: '민트 초코' },
    { name: '생일임박', phone: '010-1111-0014', email: 'birthday@example.com', visitCount: 11, totalSpent: 165000, birthday: new Date(Date.now() + 2*24*60*60*1000).toISOString().split('T')[0], lastVisit: '2025-01-05', favoriteMenu: '아메리카노' },
    { name: '마일스톤앞', phone: '010-1111-0015', email: 'mile@example.com', visitCount: 9, totalSpent: 138000, birthday: '1990-09-09', lastVisit: '2025-01-04', favoriteMenu: '바닐라 라떼' },
  ];

  // 최근 14일 매출 더미 데이터
  function generateDailySales() {
    const sales = [];
    const baseTarget = 500000;
    const today = new Date();
    
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const isWeekend = [0, 6].includes(date.getDay());
      
      // 주말엔 매출 높음, 평일엔 변동
      const baseSales = isWeekend ? 650000 : 450000;
      const variance = (Math.random() - 0.5) * 200000;
      const dailySales = Math.max(200000, Math.round(baseSales + variance));
      const orders = Math.max(30, Math.round(dailySales / (4500 + Math.random() * 2000)));
      const avgTicket = Math.round(dailySales / orders);
      const target = baseTarget + (isWeekend ? 100000 : 0);
      const achRate = ((dailySales / target) * 100).toFixed(1);
      
      sales.push({
        date: dateStr,
        dailySales,
        orderCount: orders,
        avgTicket,
        dailyTarget: target,
        achRate: parseFloat(achRate),
        isWeekend,
        metadata: { date: dateStr, dailySales, orderCount: orders, dailyTarget: target }
      });
    }
    return sales;
  }

  const sampleSchedules = [
    // 금주 스케줄 (월~일)
    { staffName: '김바리스', staffPhone: '010-1111-2222', role: '매니저', startAt: '2025-01-20T08:00:00', endAt: '2025-01-20T17:00:00', breakAt: '2025-01-20T12:00:00' },
    { staffName: '이커피', staffPhone: '010-2222-3333', role: '바리스타', startAt: '2025-01-20T08:00:00', endAt: '2025-01-20T17:00:00', breakAt: '2025-01-20T12:30:00' },
    { staffName: '박라떼', staffPhone: '010-3333-4444', role: '바리스타', startAt: '2025-01-20T12:00:00', endAt: '2025-01-20T21:00:00', breakAt: '2025-01-20T16:00:00' },
    { staffName: '최에스프', staffPhone: '010-4444-5555', role: '알바', startAt: '2025-01-20T16:00:00', endAt: '2025-01-20T22:00:00' },
    
    { staffName: '김바리스', staffPhone: '010-1111-2222', role: '매니저', startAt: '2025-01-21T08:00:00', endAt: '2025-01-21T17:00:00', breakAt: '2025-01-21T12:00:00' },
    { staffName: '이커피', staffPhone: '010-2222-3333', role: '바리스타', startAt: '2025-01-21T08:00:00', endAt: '2025-01-21T17:00:00', breakAt: '2025-01-21T12:30:00' },
    { staffName: '박라떼', staffPhone: '010-3333-4444', role: '바리스타', startAt: '2025-01-21T12:00:00', endAt: '2025-01-21T21:00:00', breakAt: '2025-01-21T16:00:00' },
    { staffName: '최에스프', staffPhone: '010-4444-5555', role: '알바', startAt: '2025-01-21T16:00:00', endAt: '2025-01-21T22:00:00' },
    
    { staffName: '김바리스', staffPhone: '010-1111-2222', role: '매니저', startAt: '2025-01-22T08:00:00', endAt: '2025-01-22T17:00:00', breakAt: '2025-01-22T12:00:00' },
    { staffName: '이커피', staffPhone: '010-2222-3333', role: '바리스타', startAt: '2025-01-22T08:00:00', endAt: '2025-01-22T17:00:00', breakAt: '2025-01-22T12:30:00' },
    { staffName: '박라떼', staffPhone: '010-3333-4444', role: '바리스타', startAt: '2025-01-22T12:00:00', endAt: '2025-01-22T21:00:00', breakAt: '2025-01-22T16:00:00' },
    
    { staffName: '김바리스', staffPhone: '010-1111-2222', role: '매니저', startAt: '2025-01-23T08:00:00', endAt: '2025-01-23T17:00:00', breakAt: '2025-01-23T12:00:00' },
    { staffName: '이커피', staffPhone: '010-2222-3333', role: '바리스타', startAt: '2025-01-23T08:00:00', endAt: '2025-01-23T17:00:00', breakAt: '2025-01-23T12:30:00' },
    { staffName: '박라떼', staffPhone: '010-3333-4444', role: '바리스타', startAt: '2025-01-23T12:00:00', endAt: '2025-01-23T21:00:00', breakAt: '2025-01-23T16:00:00' },
    { staffName: '최에스프', staffPhone: '010-4444-5555', role: '알바', startAt: '2025-01-23T16:00:00', endAt: '2025-01-23T22:00:00' },
    
    { staffName: '김바리스', staffPhone: '010-1111-2222', role: '매니저', startAt: '2025-01-24T08:00:00', endAt: '2025-01-24T17:00:00', breakAt: '2025-01-24T12:00:00' },
    { staffName: '이커피', staffPhone: '010-2222-3333', role: '바리스타', startAt: '2025-01-24T08:00:00', endAt: '2025-01-24T17:00:00', breakAt: '2025-01-24T12:30:00' },
    { staffName: '박라떼', staffPhone: '010-3333-4444', role: '바리스타', startAt: '2025-01-24T12:00:00', endAt: '2025-01-24T21:00:00', breakAt: '2025-01-24T16:00:00' },
    { staffName: '최에스프', staffPhone: '010-4444-5555', role: '알바', startAt: '2025-01-24T16:00:00', endAt: '2025-01-24T22:00:00' },
    
    { staffName: '김바리스', staffPhone: '010-1111-2222', role: '매니저', startAt: '2025-01-25T09:00:00', endAt: '2025-01-25T18:00:00', breakAt: '2025-01-25T13:00:00' },
    { staffName: '이커피', staffPhone: '010-2222-3333', role: '바리스타', startAt: '2025-01-25T09:00:00', endAt: '2025-01-25T18:00:00', breakAt: '2025-01-25T13:30:00' },
    { staffName: '박라떼', staffPhone: '010-3333-4444', role: '바리스타', startAt: '2025-01-25T13:00:00', endAt: '2025-01-25T22:00:00', breakAt: '2025-01-25T17:00:00' },
    { staffName: '최에스프', staffPhone: '010-4444-5555', role: '알바', startAt: '2025-01-25T17:00:00', endAt: '2025-01-25T23:00:00' },
    
    { staffName: '김바리스', staffPhone: '010-1111-2222', role: '매니저', startAt: '2025-01-26T09:00:00', endAt: '2025-01-26T18:00:00', breakAt: '2025-01-26T13:00:00' },
    { staffName: '이커피', staffPhone: '010-2222-3333', role: '바리스타', startAt: '2025-01-26T09:00:00', endAt: '2025-01-26T18:00:00', breakAt: '2025-01-26T13:30:00' },
    { staffName: '박라떼', staffPhone: '010-3333-4444', role: '바리스타', startAt: '2025-01-26T13:00:00', endAt: '2025-01-26T22:00:00', breakAt: '2025-01-26T17:00:00' },
  ];

// ──────────────────────────────────────────────
// API 헬퍼 (전역 api 사용 + 타임아웃)
// ──────────────────────────────────────────────
console.log('[DemoSeeder] IIFE start');
async function api(path, opts = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3초 타임아웃
    try {
      const res = await window.api(path, { ...opts, signal: controller.signal });
      clearTimeout(timeout);
      return res;
    } catch (e) {
      clearTimeout(timeout);
      throw e;
    }
  }

  // ──────────────────────────────────────────────
  // 메인 시드 함수 (개별 트라이캐치 + 타임아웃)
  // ──────────────────────────────────────────────
  async function seedAll() {
    const results = { staff: 0, inventory: 0, equipments: 0, customers: 0, sales: 0, schedules: 0, errors: [] };

    const safeApi = async (path, opts = {}) => {
      try {
        return await api(path, opts);
      } catch (e) {
        throw e;
      }
    };

    // 1. 직원
    console.log('📝 직원 시딩 중...');
    for (const s of sampleStaff) {
      try {
        await safeApi('/custom/staff', { method: 'POST', body: JSON.stringify({ ...s, workspaceId: state.currentWorkspace.id }) });
        results.staff++;
      } catch (e) { results.errors.push(`staff:${s.name}:${e.message}`); }
    }

    // 2. 재고
    console.log('📦 재고 시딩 중...');
    for (const i of sampleInventory) {
      try {
        await safeApi('/custom/inventory', { method: 'POST', body: JSON.stringify({ ...i, workspaceId: state.currentWorkspace.id }) });
        results.inventory++;
      } catch (e) { results.errors.push(`inventory:${i.name}:${e.message}`); }
    }

    // 3. 장비
    console.log('🔧 장비 시딩 중...');
    for (const e of sampleEquipments) {
      try {
        await safeApi('/custom/equipments', { method: 'POST', body: JSON.stringify({ ...e, workspaceId: state.currentWorkspace.id }) });
        results.equipments++;
      } catch (e) { results.errors.push(`equipments:${e.name}:${e.message}`); }
    }

    // 4. 고객
    console.log('☕ 고객 시딩 중...');
    for (const c of sampleCustomers) {
      try {
        await safeApi('/contacts', { method: 'POST', body: JSON.stringify({
          workspaceId: state.currentWorkspace.id,
          firstName: c.name,
          phone: c.phone,
          email: c.email,
          metadata: { visitCount: c.visitCount, totalSpent: c.totalSpent, lastVisit: c.lastVisit, birthday: c.birthday, favoriteMenu: c.favoriteMenu }
        }) });
        results.customers++;
      } catch (e) { results.errors.push(`customers:${c.name}:${e.message}`); }
    }

    // 5. 매출
    console.log('📊 매출 시딩 중...');
    const salesData = generateDailySales();
    for (const s of salesData) {
      try {
        await safeApi('/deals', { method: 'POST', body: JSON.stringify({
          workspaceId: state.currentWorkspace.id,
          title: `일매출: ${s.date}`,
          value: s.dailySales,
          stage: 'WON',
          source: 'DAILY_SALES',
          clientName: '매장 일매출',
          contactEmail: '',
          contactPhone: '',
          metadata: { date: s.date, dailySales: s.dailySales, orderCount: s.orderCount, dailyTarget: s.dailyTarget, avgTicket: s.avgTicket, achRate: s.achRate, isWeekend: s.isWeekend }
        }) });
        results.sales++;
      } catch (e) { results.errors.push(`sales:${s.date}:${e.message}`); }
    }

    // 6. 스케줄
    console.log('👥 스케줄 시딩 중...');
    for (const s of sampleSchedules) {
      try {
        await safeApi('/custom/staff-schedules', { method: 'POST', body: JSON.stringify({ ...s, workspaceId: state.currentWorkspace.id }) });
        results.schedules++;
      } catch (e) { results.errors.push(`schedules:${s.staffName}:${e.message}`); }
    }

    return results;
  }

  // ──────────────────────────────────────────────
  // 자동화 템플릿 5개 일괄 활성화
  // ──────────────────────────────────────────────
  async function activateCafeTemplates() {
    console.log('[Demo] activateCafeTemplates called');
    const templates = window.AUTOMATION_CAFE_INDIVIDUAL_TEMPLATES || [];
    console.log('[Demo] Found templates:', templates.length);
    let activated = 0;
    for (const tpl of templates) {
      try {
        const wf = {
          name: tpl.name,
          description: tpl.description,
          enabled: true,
          trigger: tpl.trigger,
          cron: tpl.cron,
          conditions: tpl.conditions || [],
          actions: tpl.actions || [],
        };
        console.log('[Demo] Creating workflow:', tpl.name);
        const created = AUTOMATION.createWorkflow(wf);
        console.log('[Demo] Created:', created.id);
        activated++;
      } catch (e) {
        console.error('[Demo] 템플릿 활성화 실패:', tpl.name, e);
      }
    }
    console.log('[Demo] Total activated:', activated);
    return activated;
  }

// ──────────────────────────────────────────────
// 즉시 실행 테스트용 (개발용)
// ──────────────────────────────────────────────
window.testActivateCafe = async function() {
  console.log('[Test] Manual testActivateCafe called');
  return await activateCafeTemplates();
};

// activateCafeTemplates도 window에 노출 (테스트용)
window.activateCafeTemplates = activateCafeTemplates;

// 페이지 로드 시 자동 실행 안 함 (버튼 클릭 시에만)

// ──────────────────────────────────────────────
  // 원클릭 전체 데모 설정
  // ──────────────────────────────────────────────
  async function runFullDemo() {
    const btn = document.getElementById('btn-demo-full');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ 데모 설정 중...'; }

    try {
      console.log('[Demo] runFullDemo started');
      
      // 1. 먼저 워크플로 즉시 활성화 (빠름)
      console.log('[Demo] Calling activateCafeTemplates...');
      const autoResult = await activateCafeTemplates();
      console.log('[Demo] activateCafeTemplates returned:', autoResult);
      
      // 2. 샘플 데이터 시딩은 백그라운드에서 (비차단)
      seedAll().then(seedResult => {
        console.log('[Demo] seedAll completed:', seedResult);
        // 대시보드 새로고침 트리거
        if (window.loadAll) loadAll();
        if (window.render) render();
        if (window.AUTOMATION_UI) AUTOMATION_UI.refresh('workflows');
        
        const msg = `✅ 데모 설정 완료!
👥 직원: ${seedResult.staff}명
📦 재고: ${seedResult.inventory}종
🔧 장비: ${seedResult.equipments}대
☕ 고객: ${seedResult.customers}명
📊 매출: ${seedResult.sales}일치
👥 스케줄: ${seedResult.schedules}건
🤖 자동화: ${autoResult}개 활성화
${seedResult.errors.length ? `\n⚠️ 일부 시딩 실패(무시 가능): ${seedResult.errors.slice(0,3).join(', ')}` : ''}`;
        
        if (btn) { btn.disabled = false; btn.textContent = '🎬 카페 데모 시작 (원클릭)'; }
        alert(msg);
        console.log('데모 결과:', seedResult, autoResult);
      }).catch(e => {
        console.error('[Demo] seedAll error:', e);
        if (btn) { btn.disabled = false; btn.textContent = '🎬 카페 데모 시작 (원클릭)'; }
      });
      
    } catch (e) {
      console.error('[Demo] runFullDemo error:', e);
      alert('❌ 데모 설정 실패: ' + e.message);
      console.error(e);
      if (btn) { btn.disabled = false; btn.textContent = '🎬 카페 데모 시작 (원클릭)'; }
    }
  }

  // ──────────────────────────────────────────────
  // UI 버튼 추가 (자동화 대시보드 상단에)
  // ──────────────────────────────────────────────
  function injectDemoButton() {
    const header = document.querySelector('.auto-header');
    if (header && !document.getElementById('btn-demo-full')) {
      const btn = document.createElement('button');
      btn.id = 'btn-demo-full';
      btn.className = 'btn-warning';
      btn.style.marginLeft = '12px';
      btn.innerHTML = '🎬 카페 데모 시작 (원클릭)';
      btn.onclick = runFullDemo;
      header.appendChild(btn);
    }
  }

  // ──────────────────────────────────────────────
  // 공개
  // ──────────────────────────────────────────────
  return { seedAll, activateCafeTemplates, runFullDemo, injectDemoButton };
})();

console.log('[DemoSeeder] IIFE executed, DEMO_SEEDER exposed');

// IIFE 내부 함수들을 window에 노출 (테스트/디버깅용)
window.activateCafeTemplates = activateCafeTemplates;
window.testActivateCafe = async function() {
  console.log('[Test] Manual testActivateCafe called');
  return await activateCafeTemplates();
};

window.DEMO_SEEDER = DEMO_SEEDER;