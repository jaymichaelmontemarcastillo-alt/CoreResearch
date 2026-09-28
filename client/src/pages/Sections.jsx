import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { DataTable, TableRow, TableCell } from "../components/ui/DataTable";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import { Modal } from "../components/ui/Modal";
import {
  HiSquares2X2,
  HiPlus,
  HiTrash,
  HiPencilSquare,
  HiArrowLeft,
  HiArrowPath,
  HiMagnifyingGlass,
} from "react-icons/hi2";
import { sectionService } from "../services/section.service";
import { courseService } from "../services/course.service";
import { useConfirm } from "../context/ConfirmContext";

export const Sections = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("success");

  // Form state
  const [isAdding, setIsAdding] = useState(false);
  const [newSection, setNewSection] = useState({
    name: "",
    specializationId: "",
    active: true,
  });
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingSection, setEditingSection] = useState(null);
  const [updatingSection, setUpdatingSection] = useState(false);

  // Spec Form state
  const [isAddingSpec, setIsAddingSpec] = useState(false);
  const [newSpec, setNewSpec] = useState({ code: "", name: "" });
  const [savingSpec, setSavingSpec] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (courseId) {
      fetchCourseAndSections();
    }
  }, [courseId]);

  const fetchCourseAndSections = async () => {
    setLoading(true);
    try {
      const courseData = await courseService.getCourseById(courseId);
      if (courseData) {
        setCourse(courseData);
        const sectionsData = await sectionService.getSectionsByCourseId(courseId);
        setSections(sectionsData);
      } else {
        showToast("Course not found.", "error");
      }
    } catch (error) {
      console.error("[Sections] fetch error:", error);
      showToast("Failed to load data.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, variant = "success") => {
    setToastMessage(msg);
    setToastVariant(variant);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newSection.name) return;

    setSaving(true);
    try {
      await sectionService.createSection({
        name: newSection.name,
        courseId: courseId,
        specializationId: newSection.specializationId || null,
        active: newSection.active,
      });
      showToast("Section added successfully.");
      setNewSection({ name: "", specializationId: "", active: true });
      setIsAdding(false);
      
      // Refresh sections
      const sectionsData = await sectionService.getSectionsByCourseId(courseId);
      setSections(sectionsData);
    } catch (error) {
      showToast(error.message || "Failed to add section", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSectionSubmit = async (e) => {
    e.preventDefault();
    if (!editingSection) return;
    setUpdatingSection(true);
    try {
      await sectionService.updateSection(editingSection.id, {
        name: editingSection.name,
        specializationId: editingSection.specializationId || null,
        active: editingSection.active,
      });
      showToast("Section updated successfully.");
      setEditingSection(null);
      const sectionsData = await sectionService.getSectionsByCourseId(courseId);
      setSections(sectionsData);
    } catch (error) {
      showToast(error.message || "Failed to update section", "error");
    } finally {
      setUpdatingSection(false);
    }
  };

  const handleToggleActive = async (section) => {
    try {
      await sectionService.updateSection(section.id, { active: !section.active });
      showToast(`Section ${section.name} is now ${!section.active ? "Active" : "Inactive"}`);
      // Refresh
      const sectionsData = await sectionService.getSectionsByCourseId(courseId);
      setSections(sectionsData);
    } catch (error) {
      showToast("Failed to update section status.", "error");
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Delete Section",
      message: "Are you sure you want to delete this section?",
      confirmText: "Delete",
      variant: "danger"
    });
    if (!isConfirmed) return;
    try {
      await sectionService.deleteSection(id);
      showToast("Section deleted.");
      // Refresh
      const sectionsData = await sectionService.getSectionsByCourseId(courseId);
      setSections(sectionsData);
    } catch (error) {
      showToast("Failed to delete section.", "error");
    }
  };

  const handleAddSpecSubmit = async (e) => {
    e.preventDefault();
    if (!newSpec.code || !newSpec.name || !course) return;

    setSavingSpec(true);
    try {
      const specId = newSpec.code.toLowerCase().replace(/[^a-z0-9]/g, "");
      const currentSpecs = course.specializations || [];
      
      if (currentSpecs.some(s => s.id === specId)) {
        showToast("Specialization with this code already exists.", "error");
        setSavingSpec(false);
        return;
      }

      const updatedSpecs = [
        ...currentSpecs,
        { id: specId, code: newSpec.code, name: newSpec.name }
      ];

      await courseService.updateCourse(courseId, { specializations: updatedSpecs });
      
      // Update local state
      setCourse({ ...course, specializations: updatedSpecs });
      showToast("Specialization added successfully.");
      setNewSpec({ code: "", name: "" });
      setIsAddingSpec(false);
    } catch (error) {
      showToast(error.message || "Failed to add specialization", "error");
    } finally {
      setSavingSpec(false);
    }
  };

  const columns = [
    { label: "Section Name" },
    ...(course?.specializations?.length > 0 ? [{ label: "Specialization" }] : []),
    { label: "Status" },
    { label: "Actions", className: "text-right" },
  ];

  const getSpecializationName = (id) => {
    if (!course?.specializations || !id) return "";
    const spec = course.specializations.find(s => s.id === id);
    return spec ? spec.name : id;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={HiSquares2X2}
        title={course ? `Sections for ${course.name}` : "Section Management"}
        description={course ? `Managing sections for ${course.code}` : "Loading..."}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-64">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search sections..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/courses")}>
            <HiArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Courses
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingSpec(!isAddingSpec)}
            disabled={!course}
          >
            <HiPlus className="w-3.5 h-3.5 mr-1.5" /> Add Specialization
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAdding(!isAdding)}
            disabled={!course}
          >
            <HiPlus className="w-3.5 h-3.5 mr-1.5" /> Add Section
          </Button>
        </div>
      </div>

      {toastMessage && (
        <Toast
          message={toastMessage}
          variant={toastVariant}
          onClose={() => setToastMessage("")}
        />
      )}

      {/* Specializations Display */}
      {course?.specializations?.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center px-1">
          <span className="text-sm font-medium text-gray-500">Specializations:</span>
          {course.specializations.map((spec) => (
            <Badge key={spec.id} variant="blue" title={spec.name}>
              {spec.code}
            </Badge>
          ))}
        </div>
      )}

      {isAddingSpec && (
        <Card className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
          <h3 className="text-sm font-semibold mb-3 text-blue-800 dark:text-blue-300">Add New Specialization</h3>
          <form onSubmit={handleAddSpecSubmit} className="flex flex-col md:flex-row gap-3 items-end">
            <div className="w-full md:w-32">
              <label className="block text-xs font-medium text-gray-500 mb-1">Code</label>
              <Input
                placeholder="e.g. WMAD"
                value={newSpec.code}
                onChange={(e) => setNewSpec({ ...newSpec, code: e.target.value })}
                required
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-gray-500 mb-1">Specialization Name</label>
              <Input
                placeholder="e.g. Web and Mobile App Development"
                value={newSpec.name}
                onChange={(e) => setNewSpec({ ...newSpec, name: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto mt-3 md:mt-0">
              <Button type="button" variant="outline" onClick={() => setIsAddingSpec(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={savingSpec}>
                Save Spec
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isAdding && (
        <Card className="p-4 bg-gray-50 dark:bg-slate-800/50">
          <h3 className="text-sm font-semibold mb-3">Add New Section</h3>
          <form onSubmit={handleAddSubmit} className="flex flex-col md:flex-row gap-3 items-end">
            <div className="flex-1 w-full md:w-auto">
              <label className="block text-xs font-medium text-gray-500 mb-1">Section Name</label>
              <Input
                placeholder="e.g. Section A"
                value={newSection.name}
                onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                required
              />
            </div>
            {course?.specializations?.length > 0 && (
              <div className="flex-1 w-full md:w-auto">
                <label className="block text-xs font-medium text-gray-500 mb-1">Specialization</label>
                <select
                  className="w-full h-10 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm px-3"
                  value={newSection.specializationId}
                  onChange={(e) => setNewSection({ ...newSection, specializationId: e.target.value })}
                  required
                >
                  <option value="" disabled>Select specialization...</option>
                  {course.specializations.map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.code} - {spec.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-2 w-full md:w-auto mt-3 md:mt-0">
              <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={saving}>
                Save
              </Button>
            </div>
          </form>
        </Card>
      )}

      <DataTable columns={columns}>
        {loading ? (
          <TableRow>
            <TableCell colSpan={course?.specializations?.length > 0 ? 4 : 3} className="py-8 text-center text-gray-400">
              Loading sections...
            </TableCell>
          </TableRow>
        ) : !course ? (
          <TableRow>
            <TableCell colSpan={3} className="py-8 text-center text-gray-400">
              Course not found.
            </TableCell>
          </TableRow>
        ) : sections.length === 0 ? (
          <TableRow>
            <TableCell colSpan={course?.specializations?.length > 0 ? 4 : 3} className="py-8 text-center text-gray-400">
              No sections found for this course.
            </TableCell>
          </TableRow>
        ) : (
          sections
            .filter((section) => 
              section.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
              (course?.specializations?.find(s => s.id === section.specializationId)?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
              (course?.specializations?.find(s => s.id === section.specializationId)?.code || "").toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((section) => (
            <TableRow key={section.id}>
              <TableCell className="font-semibold text-gray-900 dark:text-white">
                {section.name}
              </TableCell>
              {course?.specializations?.length > 0 && (
                <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                  {section.specializationId ? (
                    <Badge variant="blue">{getSpecializationName(section.specializationId)}</Badge>
                  ) : (
                    <span className="text-gray-400 italic">None</span>
                  )}
                </TableCell>
              )}
              <TableCell>
                <Badge variant={section.active ? "emerald" : "gray"}>
                  {section.active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSection({ ...section })}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    title="Edit Section"
                  >
                    <HiPencilSquare className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(section.id)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                    title="Delete Section"
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </DataTable>

      {/* Edit Section Modal */}
      <Modal
        isOpen={!!editingSection}
        onClose={() => setEditingSection(null)}
        title="Edit Section"
        icon={HiSquares2X2}
      >
        {editingSection && (
          <form onSubmit={handleEditSectionSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                Section Name
              </label>
              <Input
                value={editingSection.name}
                onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })}
                required
                placeholder="e.g. BSIT 4A"
              />
            </div>

            {course?.specializations?.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Specialization / Major
                </label>
                <select
                  className="w-full h-10 bg-white dark:bg-[#0e0f15] border border-gray-200 dark:border-[#222433] rounded-xl text-sm px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={editingSection.specializationId || ""}
                  onChange={(e) => setEditingSection({ ...editingSection, specializationId: e.target.value || null })}
                >
                  <option value="">No Specialization (General)</option>
                  {course.specializations.map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.name} ({spec.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#12131b] border border-gray-200 dark:border-[#222433]">
              <div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white block">Status</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {editingSection.active ? "Section is active and students can join" : "Section is inactive"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingSection({ ...editingSection, active: !editingSection.active })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  editingSection.active
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                    : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {editingSection.active ? "Active" : "Inactive"}
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-[#222433]">
              <Button type="button" variant="outline" onClick={() => setEditingSection(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={updatingSection}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Sections;
