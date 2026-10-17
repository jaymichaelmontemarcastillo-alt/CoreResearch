const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const substringRegex = (value) => new RegExp(escapeRegex(value.trim()), 'i');

export const buildUserListCandidateFilter = ({ role, status, search, program, courseId, specialization, major }) => {
  const conditions = [];

  if (role && role !== 'all') {
    conditions.push(role === 'faculty'
      ? { role: { $in: ['adviser', 'research_coordinator', 'panelist'] } }
      : { role });
  }

  if (status === 'pending') {
    conditions.push(
      { role: { $nin: ['admin', 'research_coordinator'] } },
      { status: { $nin: ['approved', 'active', 'rejected'] } },
      { is_approved: { $ne: true } },
      { $or: [{ status: 'pending' }, { is_approved: false }] }
    );
  } else if (status === 'rejected') {
    conditions.push({ status: 'rejected' });
  } else if (status === 'approved') {
    conditions.push({
      $or: [
        { status: { $in: ['approved', 'active'] } },
        { is_approved: true },
        { role: { $in: ['admin', 'research_coordinator'] } }
      ]
    });
  }

  const targetProgram = (program || courseId || '').trim();
  if (targetProgram && targetProgram.toLowerCase() !== 'all') {
    const regex = substringRegex(targetProgram);
    const programConditions = [
      { programCode: regex },
      { courseId: regex },
      { program: regex }
    ];
    if (targetProgram.toUpperCase() === 'BSCS') {
      programConditions.push(
        { courseId: 'bscs' },
        { program: /computer science/i }
      );
    }
    if (targetProgram.toUpperCase() === 'BSIT') {
      programConditions.push({ role: 'student' });
    }
    conditions.push({ $or: programConditions });
  }

  const targetSpecialization = (specialization || major || '').trim();
  if (targetSpecialization && targetSpecialization.toLowerCase() !== 'all') {
    const regex = substringRegex(targetSpecialization);
    const specializationConditions = [
      { majorCode: regex },
      { programSpecialization: regex },
      { major: regex }
    ];
    const legacyAliases = {
      WMAD: /WEB AND MOBILE/i,
      SMP: /SERVICE MANAGEMENT/i,
      AMG: /ANIMATION/i,
      IS: /INTELLIGENT SYSTEMS/i
    };
    const legacyAlias = legacyAliases[targetSpecialization.toUpperCase()];
    if (legacyAlias) {
      specializationConditions.push(
        { programSpecialization: legacyAlias },
        { major: legacyAlias }
      );
    }
    if (targetSpecialization.toUpperCase() === 'WMAD') {
      specializationConditions.push({ role: 'student' });
    }
    conditions.push({
      $or: specializationConditions
    });
  }

  const normalizedSearch = (search || '').trim();
  if (normalizedSearch) {
    const regex = substringRegex(normalizedSearch);
    const searchConditions = [
      { fullName: regex },
      { email: regex },
      { studentIdOrEmployeeId: regex },
      { programCode: regex },
      { courseId: regex },
      { program: regex },
      { majorCode: regex },
      { programSpecialization: regex },
      { sectionName: regex },
      { section: regex }
    ];

    if (['bsit', 'bscs', 'wmad', 'a'].some(value => value.includes(normalizedSearch.toLowerCase()))) {
      searchConditions.push({ role: 'student' });
    }
    if ('bscs'.includes(normalizedSearch.toLowerCase())) {
      searchConditions.push({ courseId: 'bscs' }, { program: /computer science/i });
    }
    if ('bsit'.includes(normalizedSearch.toLowerCase())) {
      searchConditions.push({ courseId: 'bsit' }, { program: /information technology/i });
    }
    conditions.push({ $or: searchConditions });
  }

  return conditions.length ? { $and: conditions } : {};
};
