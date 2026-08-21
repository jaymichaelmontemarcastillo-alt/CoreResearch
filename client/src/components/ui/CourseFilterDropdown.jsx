// src/components/ui/CourseFilterDropdown.jsx
import React, { useState, useRef, useEffect } from "react";
import { HiChevronDown, HiChevronRight, HiCheck } from "react-icons/hi2";

export const CourseFilterDropdown = ({
  courses = [],
  sectionsByCourse = {},
  selectedCourse,
  selectedSpecialization,
  selectedSection,
  onSelect,
  placeholder = "All Programs",
}) => {
  const [open, setOpen] = useState(false);
  const [hoveredCourse, setHoveredCourse] = useState(null);
  const [hoveredSpec, setHoveredSpec] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setHoveredCourse(null);
        setHoveredSpec(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getLabel = () => {
    const course = courses.find((c) => c.id === selectedCourse);
    if (!course) return placeholder;
    const spec = course.specializations?.find((s) => s.id === selectedSpecialization);
    const allSecs = sectionsByCourse[selectedCourse] || [];
    const sec = allSecs.find((s) => s.id === selectedSection);
    let label = course.code;
    if (spec) label += " - " + (spec.code || spec.name);
    if (sec) label += " - " + sec.name;
    return label;
  };

  const hoveredCourseObj = courses.find((c) => c.id === hoveredCourse);
  const hoveredCourseSpecs = hoveredCourseObj?.specializations || [];
  const hoveredCourseSecs = sectionsByCourse[hoveredCourse] || [];
  const hoveredSpecSecs = hoveredSpec
    ? hoveredCourseSecs.filter((s) => s.specializationId === hoveredSpec)
    : [];

  const close = () => {
    setOpen(false);
    setHoveredCourse(null);
    setHoveredSpec(null);
  };

  const handleSelectCourse = (courseId) => {
    onSelect(courseId || null, null, null);
    close();
  };

  const handleSelectSpec = (courseId, specId) => {
    onSelect(courseId, specId, null);
    close();
  };

  const handleSelectSection = (courseId, specId, sectionId) => {
    onSelect(courseId, specId || null, sectionId);
    close();
  };

  const panelCls =
    "bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden py-1.5";
  const itemBaseCls =
    "w-full flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-left transition-colors duration-100 outline-none";
  const itemIdleCls = "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800";
  const itemActiveCls = "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400";

  return (
    <div ref={containerRef} className="relative w-full" style={{ minWidth: "160px" }}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setHoveredCourse(null); setHoveredSpec(null); }}
        className="w-full h-10 flex items-center justify-between px-3.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-[13px] font-medium text-gray-600 dark:text-gray-300 shadow-sm hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
      >
        <span className="truncate">{getLabel()}</span>
        <HiChevronDown className={"w-4 h-4 shrink-0 text-gray-400 ml-2 transition-transform duration-200 " + (open ? "rotate-180" : "")} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1.5 flex items-start gap-2">
          <div className={panelCls} style={{ minWidth: "180px" }}>
            <button
              className={itemBaseCls + " " + (!selectedCourse && !hoveredCourse ? itemActiveCls : itemIdleCls)}
              onClick={() => handleSelectCourse(null)}
              onMouseEnter={() => { setHoveredCourse(null); setHoveredSpec(null); }}
            >
              <span className="flex-1">All Programs</span>
              {!selectedCourse && <HiCheck className="w-4 h-4 text-blue-500 shrink-0" />}
            </button>

            {courses.map((course) => {
              const hasSpecs = (course.specializations || []).length > 0;
              const hasSecs = (sectionsByCourse[course.id] || []).length > 0;
              const hasFlyout = hasSpecs || hasSecs;
              const isHovered = hoveredCourse === course.id;
              const isSelected = selectedCourse === course.id;

              return (
                <button
                  key={course.id}
                  className={itemBaseCls + " " + (isHovered ? itemActiveCls : isSelected ? "bg-blue-50/50 dark:bg-blue-500/5 text-blue-600 dark:text-blue-400" : itemIdleCls)}
                  onClick={() => !hasFlyout && handleSelectCourse(course.id)}
                  onMouseEnter={() => { setHoveredCourse(course.id); setHoveredSpec(null); }}
                >
                  <span className="flex-1 font-semibold">{course.code}</span>
                  {isSelected && !isHovered && <HiCheck className="w-4 h-4 text-blue-500 shrink-0" />}
                  {hasFlyout && <HiChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {hoveredCourse && hoveredCourseSpecs.length > 0 && (
            <div className={panelCls} style={{ minWidth: "240px" }}>
              <div className="px-4 pb-1 pt-0.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Specialization</div>
              <button className={itemBaseCls + " " + itemIdleCls + " border-b border-gray-100 dark:border-slate-700 mb-1"} onClick={() => handleSelectCourse(hoveredCourse)} onMouseEnter={() => setHoveredSpec(null)}>
                <span className="text-[12px] text-gray-400 italic">All specializations</span>
              </button>
              {hoveredCourseSpecs.map((spec) => {
                const specSecs = hoveredCourseSecs.filter((s) => s.specializationId === spec.id);
                const isSpecHovered = hoveredSpec === spec.id;
                return (
                  <button key={spec.id} className={itemBaseCls + " " + (isSpecHovered ? itemActiveCls : itemIdleCls)} onClick={() => handleSelectSpec(hoveredCourse, spec.id)} onMouseEnter={() => setHoveredSpec(spec.id)}>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-semibold text-[13px] leading-tight">{spec.code}</div>
                      {spec.name && spec.name !== spec.code && (
                        <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate leading-tight mt-0.5">{spec.name}</div>
                      )}
                    </div>
                    {specSecs.length > 0 && <HiChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {hoveredCourse && hoveredCourseSpecs.length === 0 && hoveredCourseSecs.length > 0 && (
            <div className={panelCls} style={{ minWidth: "160px" }}>
              <div className="px-4 pb-1 pt-0.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Section</div>
              <button className={itemBaseCls + " " + itemIdleCls + " border-b border-gray-100 dark:border-slate-700 mb-1"} onClick={() => handleSelectCourse(hoveredCourse)}>
                <span className="text-[12px] text-gray-400 italic">No specific section</span>
              </button>
              {hoveredCourseSecs.map((sec) => (
                <button key={sec.id} className={itemBaseCls + " " + itemIdleCls} onClick={() => handleSelectSection(hoveredCourse, null, sec.id)}>
                  <span className="font-semibold">{sec.name}</span>
                </button>
              ))}
            </div>
          )}

          {hoveredSpec && hoveredSpecSecs.length > 0 && (
            <div className={panelCls} style={{ minWidth: "160px" }}>
              <div className="px-4 pb-1 pt-0.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Section</div>
              <button className={itemBaseCls + " " + itemIdleCls + " border-b border-gray-100 dark:border-slate-700 mb-1"} onClick={() => handleSelectSpec(hoveredCourse, hoveredSpec)}>
                <span className="text-[12px] text-gray-400 italic">No specific section</span>
              </button>
              {hoveredSpecSecs.map((sec) => (
                <button key={sec.id} className={itemBaseCls + " " + itemIdleCls} onClick={() => handleSelectSection(hoveredCourse, hoveredSpec, sec.id)}>
                  <span className="font-semibold">{sec.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CourseFilterDropdown;

