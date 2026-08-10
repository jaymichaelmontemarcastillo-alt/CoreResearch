import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { DataTable, TableRow, TableCell } from "../components/ui/DataTable";
import { PageHeader } from "../components/ui/PageHeader";
import { Toast } from "../components/ui/Toast";
import { LayoutGrid, Plus, Trash2, Edit2, ArrowLeft, RefreshCw } from "lucide-react";
import { sectionService } from "../services/section.service";
import { courseService } from "../services/course.service";

export const Sections = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("success");

  // Form state
  const [isAdding, setIsAdding] = useState(false);
  const [newSection, setNewSection] = useState({
    name: "",
    active: true,
  });
  const [saving, setSaving] = useState(false);

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
        active: newSection.active,
      });
      showToast("Section added successfully.");
      setNewSection({ name: "", active: true });
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
    if (!window.confirm("Are you sure you want to delete this section?")) return;
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

  const columns = [
    { label: "Section Name" },
    { label: "Status" },
    { label: "Actions", className: "text-right" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutGrid}
        title={course ? `Sections for ${course.name}` : "Section Management"}
        description={course ? `Managing sections for ${course.code}` : "Loading..."}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/courses")}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Courses
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCourseAndSections}
              isLoading={loading}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAdding(!isAdding)}
              disabled={!course}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Section
            </Button>
          </div>
        }
      />

      {toastMessage && (
        <Toast
          message={toastMessage}
          variant={toastVariant}
          onClose={() => setToastMessage("")}
        />
      )}

      {isAdding && (
        <Card className="p-4 bg-gray-50 dark:bg-slate-800/50">
          <h3 className="text-sm font-semibold mb-3">Add New Section</h3>
          <form onSubmit={handleAddSubmit} className="flex flex-col md:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-gray-500 mb-1">Section Name</label>
              <Input
                placeholder="e.g. Section A"
                value={newSection.name}
                onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                required
              />
            </div>
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
            <TableCell colSpan={3} className="py-8 text-center text-gray-400">
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
            <TableCell colSpan={3} className="py-8 text-center text-gray-400">
              No sections found for this course.
            </TableCell>
          </TableRow>
        ) : (
          sections.map((section) => (
            <TableRow key={section.id}>
              <TableCell className="font-semibold text-gray-900 dark:text-white">
                {section.name}
              </TableCell>
              <TableCell>
                <Badge variant={section.active ? "emerald" : "gray"}>
                  {section.active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleToggleActive(section)}
                    title="Toggle Status"
                  >
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(section.id)}
                    title="Delete Section"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </DataTable>
    </div>
  );
};

export default Sections;
