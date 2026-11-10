const DAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const COMMUNITY_LABELS = {
  matriz: 'Matriz Espírito Santo',
  fatima: 'Nossa Senhora de Fátima',
  filomena: 'Santa Filomena'
};
const POSITIONS = [
  { label: 'FRENTE', csvLabel: 'FRENTE 1' },
  { label: 'FRENTE', csvLabel: 'FRENTE 2' },
  { label: 'LATERAL', csvLabel: 'LATERAL 1' },
  { label: 'LATERAL', csvLabel: 'LATERAL 2' },
  { label: 'FUNDO', csvLabel: 'FUNDO' }
];
const WEEKLY_MASSES = [
  { community: 'matriz', weekday: 0, time: '08:00' },
  { community: 'matriz', weekday: 0, time: '10:00' },
  { community: 'matriz', weekday: 0, time: '18:00' },
  { community: 'matriz', weekday: 3, time: '20:00' },
  { community: 'matriz', weekday: 5, time: '15:00' },
  { community: 'matriz', weekday: 6, time: '19:00' },
  { community: 'fatima', weekday: 0, time: '08:30' },
  { community: 'fatima', weekday: 2, time: '20:00' },
  { community: 'filomena', weekday: 0, time: '07:00' },
  { community: 'filomena', weekday: 4, time: '20:00' }
];

function normalizedText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleUpperCase('pt-BR');
}

function communityKey(value) {
  const text = normalizedText(value);
  if (text.includes('MATRIZ') || text.includes('PAROQUIA')) return 'matriz';
  if (text.includes('FATIMA')) return 'fatima';
  if (text.includes('FILOMENA')) return 'filomena';
  return null;
}

function dateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function generateMonthlySchedule({ year, month, roster, unavailabilities = [] }) {
  if (!Number.isInteger(year) || year < 1900 || year > 9999) {
    throw new RangeError('Informe um ano válido.');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError('Informe um mês válido entre 1 e 12.');
  }
  if (!Array.isArray(roster) || roster.length === 0) {
    throw new TypeError('A lista de membros e comunidades está vazia ou inválida.');
  }

  const membersByCommunity = new Map(Object.keys(COMMUNITY_LABELS).map(key => [key, []]));
  const namesSeen = new Set();
  for (const member of roster) {
    const name = String(member?.name ?? '').trim();
    const key = communityKey(member?.community);
    if (!name || !key) {
      throw new TypeError(`Membro ou comunidade inválida na lista: ${name || '(sem nome)'}.`);
    }
    const nameKey = normalizedText(name);
    if (namesSeen.has(nameKey)) {
      throw new TypeError(`O membro ${name} aparece mais de uma vez na lista de comunidades.`);
    }
    namesSeen.add(nameKey);
    membersByCommunity.get(key).push({ name, key: nameKey });
  }

  const eventsByKey = new Map();
  const addEvent = (day, weekday, rule, occasion = '') => {
    const date = dateKey(year, month, day);
    const key = `${date}|${rule.community}|${rule.time}`;
    const existing = eventsByKey.get(key);
    if (existing) {
      if (occasion) existing.occasion = occasion;
      return;
    }
    eventsByKey.set(key, {
      date,
      weekday: DAYS[weekday],
      time: rule.time,
      communityKey: rule.community,
      community: COMMUNITY_LABELS[rule.community],
      occasion,
      positions: POSITIONS.map(position => ({ ...position, member: '' })),
      note: ''
    });
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekday = new Date(year, month - 1, day).getDay();
    for (const rule of WEEKLY_MASSES) {
      if (rule.weekday === weekday) addEvent(day, weekday, rule);
    }
    if (weekday === 6 && day <= 7) {
      addEvent(day, weekday, { community: 'matriz', time: '08:00' }, 'Imaculado Coração de Maria');
    }
    if (day === 10) {
      addEvent(day, weekday, { community: 'filomena', time: '20:00' }, 'Novena de Santa Filomena');
    }
  }

  const unavailable = new Set(
    unavailabilities.map(item => `${normalizedText(item.member)}|${item.date}`)
  );
  const serviceCounts = new Map();
  for (const members of membersByCommunity.values()) {
    for (const member of members) serviceCounts.set(member.key, 0);
  }
  const tieOrder = new Map();
  const servingOnDate = new Map();
  const events = [...eventsByKey.values()].sort((a, b) =>
    a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.community.localeCompare(b.community)
  );

  for (const event of events) {
    const candidates = membersByCommunity.get(event.communityKey);
    const alreadyServing = servingOnDate.get(event.date) || new Set();
    const rotationStart = tieOrder.get(event.communityKey) || 0;
    const eligible = candidates
      .filter(member => !unavailable.has(`${member.key}|${event.date}`) && !alreadyServing.has(member.key))
      .sort((a, b) => {
        const byCount = serviceCounts.get(a.key) - serviceCounts.get(b.key);
        if (byCount) return byCount;
        const aPosition = candidates.indexOf(a);
        const bPosition = candidates.indexOf(b);
        return (aPosition - rotationStart + candidates.length) % candidates.length
          - (bPosition - rotationStart + candidates.length) % candidates.length;
      });

    const assigned = eligible.slice(0, POSITIONS.length);
    event.positions.forEach((position, index) => {
      position.member = assigned[index]?.name || '';
    });
    for (const member of assigned) {
      serviceCounts.set(member.key, serviceCounts.get(member.key) + 1);
      alreadyServing.add(member.key);
    }
    if (assigned.length < POSITIONS.length) {
      const missing = POSITIONS.length - assigned.length;
      event.note = `Faltam ${missing} posto${missing === 1 ? '' : 's'} para completar os cinco.`;
    }
    if (assigned.length) {
      tieOrder.set(event.communityKey, (rotationStart + 1) % candidates.length);
    }
    servingOnDate.set(event.date, alreadyServing);
  }

  return events;
}
