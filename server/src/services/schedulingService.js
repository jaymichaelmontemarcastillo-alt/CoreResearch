export const checkConflicts = (proposedSchedule, existingSchedules) => {
  const conflicts = [];

  const parseTime = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };

  const isOverlapping = (s1, e1, s2, e2) => {
    return Math.max(s1, s2) < Math.min(e1, e2);
  };

  const proposedStart = parseTime(proposedSchedule.startTime);
  const proposedEnd = parseTime(proposedSchedule.endTime);

  for (const existing of existingSchedules) {
    if (existing.date !== proposedSchedule.date) continue;

    const existingStart = parseTime(existing.startTime);
    const existingEnd = parseTime(existing.endTime);

    if (isOverlapping(proposedStart, proposedEnd, existingStart, existingEnd)) {
      // 1. Venue Conflict
      if (existing.venue === proposedSchedule.venue || existing.location === proposedSchedule.venue) {
        conflicts.push(`Venue '${proposedSchedule.venue}' is already booked from ${existing.startTime} to ${existing.endTime}.`);
      }

      // 2. Group Conflict
      if (existing.projectId === proposedSchedule.projectId) {
        conflicts.push(`Group '${proposedSchedule.projectTitle}' is already scheduled from ${existing.startTime} to ${existing.endTime}.`);
      }

      // 3. Adviser Conflict
      if (existing.adviserId && proposedSchedule.adviserId && existing.adviserId === proposedSchedule.adviserId) {
        conflicts.push(`Adviser '${proposedSchedule.adviserName}' is already required in another defense from ${existing.startTime} to ${existing.endTime}.`);
      }

      // 4. Panelist Conflict
      const existingPanelistIds = existing.panelists ? existing.panelists.map(p => p.id) : (existing.panelistIds || []);
      const proposedPanelistIds = proposedSchedule.panelistIds || [];
      const commonPanelists = proposedPanelistIds.filter(id => existingPanelistIds.includes(id));
      
      if (commonPanelists.length > 0) {
        // Find names for better error message
        const conflictNames = proposedSchedule.panelists
          .filter(p => commonPanelists.includes(p.id))
          .map(p => p.name)
          .join(', ');
        conflicts.push(`Panelist(s) ${conflictNames} already assigned to another defense from ${existing.startTime} to ${existing.endTime}.`);
      }
    }
  }

  return conflicts;
};

export const generateTimeSlots = (config, groups, existingSchedules) => {
  const { date, venue, durationMinutes, startTime, breakStart, breakEnd, endTime, defenseType } = config;

  const parseTime = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };

  const formatTime = (totalMinutes) => {
    const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const m = (totalMinutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  let currentMinutes = parseTime(startTime);
  const breakStartMin = parseTime(breakStart);
  const breakEndMin = parseTime(breakEnd);
  const endOfDayMin = parseTime(endTime);

  const proposedSchedules = [];
  const errors = [];
  
  // Track assigned for conflict checking within the generated batch
  const allSchedulesToCheck = [...existingSchedules];

  for (const group of groups) {
    let slotFound = false;

    // Find next available slot
    while (currentMinutes + durationMinutes <= endOfDayMin) {
      const potentialEnd = currentMinutes + durationMinutes;

      // Skip break
      if (currentMinutes < breakEndMin && potentialEnd > breakStartMin) {
        currentMinutes = breakEndMin;
        continue;
      }

      const proposed = {
        projectId: group.id,
        projectTitle: group.title || 'Untitled',
        date,
        startTime: formatTime(currentMinutes),
        endTime: formatTime(potentialEnd),
        venue,
        defenseType,
        adviserId: group.adviserId,
        adviserName: group.adviserName,
        panelistIds: group.panelistIds || [],
        panelists: (group.panelists || []).map(p => ({
           id: p.uid || p.id,
           name: p.fullName || p.name,
           role: p.role || 'panelist'
        }))
      };

      const conflicts = checkConflicts(proposed, allSchedulesToCheck);

      if (conflicts.length === 0) {
        proposedSchedules.push(proposed);
        allSchedulesToCheck.push(proposed);
        currentMinutes += durationMinutes;
        slotFound = true;
        break;
      } else {
        // If there's a conflict (e.g. panelist is busy), we try the next slot.
        // Or we could report the conflict and fail. Since it's automated scheduling for a list,
        // if a panelist is busy, we push the group to the next slot.
        currentMinutes += durationMinutes; // Simple algorithm: just try next slot.
      }
    }

    if (!slotFound) {
      errors.push(`Not enough available time to schedule group '${group.title || group.id}'.`);
    }
  }

  return { proposedSchedules, errors };
};
