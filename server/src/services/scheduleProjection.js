const compactFields = (fields) => Object.fromEntries(
  Object.entries(fields).filter(([, value]) => value !== undefined)
);

export const toDefenseScheduleProjection = (schedule) => {
  const data = typeof schedule.toObject === 'function' ? schedule.toObject() : schedule;
  const panelists = (data.panelists || []).map(panelist => compactFields({
    id: panelist.id || panelist.uid,
    name: panelist.name || panelist.fullName,
    email: panelist.email || '',
    role: panelist.role || 'panelist'
  }));

  const isFinal = data.type === 'final_defense' || data.defenseType === 'final_defense';

  return compactFields({
    id: data.id,
    projectId: data.projectId,
    projectTitle: data.projectTitle || '',
    studentName: data.studentName || 'Student Researcher',
    studentNames: Array.isArray(data.members) && data.members.length > 0
      ? data.members.map(m => m.fullName || m.name).filter(Boolean)
      : (Array.isArray(data.studentNames) && data.studentNames.length > 0 ? data.studentNames : (data.studentName ? [data.studentName] : [])),
    members: data.members || [],
    courseId: data.courseId,
    courseName: data.courseName,
    program: data.program || (data.courseId ? data.courseId.toUpperCase() : undefined),
    specialization: data.specialization,
    specializationName: data.specializationName,
    sectionName: data.sectionName,
    defenseType: isFinal ? 'final_defense' : 'proposal_defense',
    type: isFinal ? 'final_defense' : 'proposal',
    date: data.date || '',
    startTime: data.time || data.startTime || '',
    endTime: data.endTime || data.time || data.startTime || '',
    venue: data.location || data.venue || '',
    panelistIds: panelists.map(panelist => panelist.id).filter(Boolean),
    panelistNames: panelists.map(panelist => panelist.name).filter(Boolean),
    panelists,
    adviserId: data.adviserId || '',
    adviserName: data.adviserName || '',
    memberIds: data.memberIds || [],
    status: data.status || 'scheduled',
    attempt: data.attempt,
    defenseStage: data.defenseStage || (isFinal ? 'Final Defense' : 'Proposal Defense'),
    notes: data.notes,
    resultStatus: data.resultStatus,
    createdAt: data.createdAt instanceof Date ? data.createdAt.toISOString() : data.createdAt,
    updatedAt: data.updatedAt instanceof Date ? data.updatedAt.toISOString() : data.updatedAt
  });
};
