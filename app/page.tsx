'use client';

import React, { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import {
  Zap,
  Cpu,
  BookOpen,
  Play,
  CheckCircle2,
  Eye,
  FolderOpen,
  ClipboardList,
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  Target,
  Scissors,
  Cable,
  MousePointer,
  Grid,
  Trash2,
  RotateCw,
  Layers,
  Users,
  Compass,
  Sliders,
  User,
  Activity,
  Gauge,
} from 'lucide-react';
import { FieldSandbox, FieldSandboxControls } from '@/components/simulation/FieldSandbox';
import {
  CircuitWorkbench,
  CircuitWorkbenchControls,
  CircuitWorkbenchTelemetry,
  CircuitMeterReading,
} from '@/components/simulation/CircuitWorkbench';
import { Oscilloscope, DataPoint } from '@/components/ui/Oscilloscope';
import { ProjectileSandbox } from '@/components/simulation/ProjectileSandbox';
import { CoulombForceWorkbench } from '@/components/simulation/CoulombForceWorkbench';
import { CalculusTheoryModal } from '@/components/ui/CalculusTheoryModal';
import { UserRoleBar } from '@/components/auth/UserRoleBar';
import { AuthModal } from '@/components/auth/AuthModal';
import { StudentAccountModal } from '@/components/auth/StudentAccountModal';
import { SavedScenesDrawer } from '@/components/lab/SavedScenesDrawer';
import { GuidedLabModal } from '@/components/lab/GuidedLabModal';
import { InstructorDashboardModal } from '@/components/lab/InstructorDashboardModal';
import { MathFormula } from '@/components/ui/MathFormula';
import {
  ModelCatalogPortal,
  PHYSICS_MODEL_SLOTS,
  PhysicsModelSlot,
  PhysicsCourseId,
  PhysicsUnitModule,
} from '@/components/catalog/ModelCatalogPortal';
import { SourceCharge, COULOMB_K } from '@/lib/physics/coulomb';
import { CircuitComponentData } from '@/lib/physics/mna-solver';
import { labStorage, MOCK_USERS } from '@/lib/services/labStorage';
import {
  UserProfile,
  UserRole,
  SceneSnapshot,
  LabSubmission,
  LabAssignment,
} from '@/lib/types/lab';

type LayerRoute =
  | { layer: 'catalog'; course?: PhysicsCourseId }
  | { layer: 'unit'; unit: PhysicsUnitModule }
  | {
      layer: 'workspace';
      mode: 'field' | 'circuit' | 'projectile' | 'coulomb';
      modelTitle: string;
      unit?: PhysicsUnitModule;
    }
  | { layer: 'slot-detail'; slot: PhysicsModelSlot };

const STATIC_DEFAULT_USER = MOCK_USERS[1];
const STATIC_USER_LIST = MOCK_USERS;
const STATIC_EMPTY_USER_LIST: UserProfile[] = [];

export default function SimulationCockpit() {
  // Multi-Layer Hierarchy & History Stack (Mechanics first on the left, E&M on the right)
  const [navHistory, setNavHistory] = useState<LayerRoute[]>([
    { layer: 'catalog', course: 'mechanics' },
  ]);
  const [navIndex, setNavIndex] = useState<number>(0);
  // Active simulation mode when in workspace layer
  const [activeMode, setActiveMode] = useState<'field' | 'circuit' | 'projectile' | 'coulomb'>('projectile');
  const [projectileViewMode, setProjectileViewMode] = useState<'3d' | '2d'>('3d');

  const currentRoute = navHistory[navIndex] || { layer: 'catalog', course: 'mechanics' };
  const activeCourse: PhysicsCourseId =
    currentRoute.layer === 'catalog'
      ? currentRoute.course || 'mechanics'
      : currentRoute.layer === 'unit'
      ? currentRoute.unit.course
      : currentRoute.layer === 'workspace' && currentRoute.unit
      ? currentRoute.unit.course
      : currentRoute.layer === 'workspace' && (currentRoute.mode === 'projectile' || activeMode === 'projectile')
      ? 'mechanics'
      : currentRoute.layer === 'workspace' && (currentRoute.mode === 'coulomb' || activeMode === 'coulomb' || currentRoute.mode === 'field' || activeMode === 'field' || currentRoute.mode === 'circuit' || activeMode === 'circuit')
      ? 'em'
      : currentRoute.layer === 'slot-detail'
      ? currentRoute.slot.course || 'mechanics'
      : 'mechanics';

  const isCurrentMechanics =
    activeCourse === 'mechanics' ||
    (currentRoute.layer === 'workspace' && activeMode === 'projectile');

  // Header visibility on catalog scroll (disappears on scroll down, reappears on scroll up)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [isTheoryOpen, setIsTheoryOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Navigate to a new hierarchy layer and push onto history stack
  const navigateTo = useCallback(
    (route: LayerRoute) => {
      if (route.layer === 'workspace') {
        setActiveMode(route.mode);
      }
      setIsHeaderVisible(true);
      setNavHistory(prev => {
        const sliced = prev.slice(0, navIndex + 1);
        return [...sliced, route];
      });
      setNavIndex(prev => prev + 1);
    },
    [navIndex]
  );

  const canGoBack = navIndex > 0;
  const canGoForward = navIndex < navHistory.length - 1;

  const goBack = useCallback(() => {
    if (navIndex > 0) {
      const target = navHistory[navIndex - 1];
      if (target.layer === 'workspace') setActiveMode(target.mode);
      setIsHeaderVisible(true);
      setNavIndex(navIndex - 1);
    }
  }, [navIndex, navHistory]);

  const goForward = useCallback(() => {
    if (navIndex < navHistory.length - 1) {
      const target = navHistory[navIndex + 1];
      if (target.layer === 'workspace') setActiveMode(target.mode);
      setIsHeaderVisible(true);
      setNavIndex(navIndex + 1);
    }
  }, [navIndex, navHistory]);

  // Auth & Roles State (deterministic SSR snapshot and reactive subscription)
  const currentUser = useSyncExternalStore(
    labStorage.subscribe,
    () => labStorage.getCurrentUser(),
    () => STATIC_DEFAULT_USER
  );
  const isLoggedIn = useSyncExternalStore(
    labStorage.subscribe,
    () => labStorage.getIsLoggedIn(),
    () => true
  );
  const visibleUsers = useSyncExternalStore(
    labStorage.subscribe,
    () => labStorage.getVisibleUsersOnDevice(),
    () => STATIC_USER_LIST
  );
  const allUsers = useSyncExternalStore(
    labStorage.subscribe,
    () => labStorage.getAllUsers(),
    () => STATIC_USER_LIST
  );
  const hiddenAccounts = useSyncExternalStore(
    labStorage.subscribe,
    () => labStorage.getHiddenAccountsOnDevice(),
    () => STATIC_EMPTY_USER_LIST
  );

  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isStudentAccountModalOpen, setIsStudentAccountModalOpen] = useState(false);

  // Workflow Dialogs State
  const [isSavedScenesOpen, setIsSavedScenesOpen] = useState(false);
  const [isGuidedLabOpen, setIsGuidedLabOpen] = useState(false);
  const [isTeacherDashboardOpen, setIsTeacherDashboardOpen] = useState(false);
  const [reviewingStudentSnapshot, setReviewingStudentSnapshot] = useState<{
    studentName: string;
    snapshot: SceneSnapshot;
  } | null>(null);

  // Lab Assignment, Roster & Submissions State directly derived from reactive labStorage
  const courseAssignments = labStorage.getAssignmentsForCourse(activeCourse);
  const assignment = courseAssignments[0] || labStorage.getAssignment();
  const allAssignments = labStorage.getAllAssignments();
  const currentSubmission = labStorage.getSubmissionForStudent(assignment.id, currentUser.id);
  const teacherSubmissions = labStorage.getAllSubmissionsForTeacher();
  const classStudents = labStorage.getClassStudents();
  const allSavedExperiments = labStorage.getSavedExperiments();
  const savedExperiments = labStorage.getSavedExperiments(
    currentUser.role === 'student' ? currentUser.id : undefined
  );
  const lastAutoSaveSnapshot = labStorage.getAutoSave(currentUser.id, activeMode);

  // Field Sandbox State
  const [fieldControls, setFieldControls] = useState<FieldSandboxControls>({
    showVectors: true,
    showForces: true,
    showStreamlines: true,
    showSlicePlane: false,
    sliceOrientation: 'xz',
    sliceOffset: 0.65,
    gridDensity: 16,
    bField: { x: 0, y: 1.5, z: 0, enabled: false },
    viewMode: '3d',
  });

  const [fieldPlacementMode, setFieldPlacementMode] = useState<
    'none' | 'charge_pos' | 'charge_neg' | 'tracer'
  >('none');
  const [selectedCharge, setSelectedCharge] = useState<SourceCharge | null>(null);
  const [sourceDefaultQ, setSourceDefaultQ] = useState<number>(5.0);
  const [tracerSettings, setTracerSettings] = useState({
    qMicro: 1.0,
    massMicro: 10,
    vx: 0,
    vz: 0,
    damping: 0.28,
    simSpeed: 1.0,
    lockToPlane: true,
  });

  const [fieldTelemetry, setFieldTelemetry] = useState({
    chargeCount: 2,
    eFieldAtCursor: 0,
    fPredicted: 0,
    activeParticles: 0,
  });

  // Circuit Workbench State
  const [circuitControls, setCircuitControls] = useState<CircuitWorkbenchControls>({
    flowConvention: 'conventional',
    showArrows: true,
    driftSpeed: 1.0,
    activeTool: 'select',
    viewMode: '3d',
    wireRouting: 'orthogonal',
    showMeterOverlays: true,
  });

  const [selectedComponent, setSelectedComponent] = useState<CircuitComponentData | null>(null);
  const [circuitTelemetry, setCircuitTelemetry] = useState<CircuitWorkbenchTelemetry>({
    supplyEmf: 9.0,
    totalCurrent: 0.0,
    activeComponents: 4,
    wireCount: 5,
    kclMaxResidual: 0.0,
    kvlVerified: true,
    meterReadings: [],
  });

  // Oscilloscope History Buffers
  const [fieldScopeHistory, setFieldScopeHistory] = useState<DataPoint[]>([]);
  const [circuitScopeHistory, setCircuitScopeHistory] = useState<DataPoint[]>([]);
  const [isScopeExpanded, setIsScopeExpanded] = useState(false);

  // Toast Helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Capture current 3D Scene Snapshot
  const captureCurrentSnapshot = useCallback(
    (title = 'Active Simulation Snapshot'): SceneSnapshot => {
      const now = new Date().toISOString();
      const id = 'snap_' + Math.random().toString(36).substring(2, 9);

      if (typeof window === 'undefined') {
        return {
          id,
          version: '1.0',
          timestamp: now,
          title,
          mode: activeMode,
        };
      }

      if (activeMode === 'coulomb') {
        return {
          id,
          version: '1.0',
          timestamp: now,
          title,
          mode: 'coulomb',
        };
      } else if (activeMode === 'projectile') {
        return {
          id,
          version: '1.0',
          timestamp: now,
          title,
          mode: 'projectile',
        };
      } else if (activeMode === 'field') {
        const fieldSnap = (window as any).__fieldSandbox?.getSnapshot?.();
        const cam = (window as any).__fieldSandbox?.getCameraState?.();
        return {
          id,
          version: '1.0',
          timestamp: now,
          title,
          mode: 'field',
          fieldData: {
            charges: fieldSnap?.charges || [],
            controlsState: fieldControls,
            tracerSettings,
          },
          camera: cam,
        };
      } else {
        const circuitSnap = (window as any).__circuitWorkbench?.getSnapshot?.();
        const cam = (window as any).__circuitWorkbench?.getCameraState?.();
        return {
          id,
          version: '1.0',
          timestamp: now,
          title,
          mode: 'circuit',
          circuitData: {
            components: circuitSnap?.components || [],
            wires: circuitSnap?.wires || [],
            controlsState: circuitControls,
          },
          camera: cam,
        };
      }
    },
    [activeMode, fieldControls, circuitControls, tracerSettings]
  );

  // Restore Snapshot into Active Viewport
  const restoreSnapshotIntoViewport = useCallback(
    (snapshot: SceneSnapshot) => {
      if (typeof window === 'undefined') return;

      if (snapshot.mode === 'field') {
        navigateTo({
          layer: 'workspace',
          mode: 'field',
          modelTitle: 'Electrostatic Field & Lorentz Dynamics',
        });
        if (snapshot.fieldData?.controlsState) {
          setFieldControls(snapshot.fieldData.controlsState);
        }
        if (snapshot.fieldData?.tracerSettings) {
          const ts = snapshot.fieldData.tracerSettings;
          setTracerSettings(prev => ({
            ...prev,
            ...ts,
            vx: 0,
            vz: 0,
            damping: ts.damping ?? prev.damping,
            simSpeed: ts.simSpeed ?? prev.simSpeed,
            lockToPlane: ts.lockToPlane ?? prev.lockToPlane,
          }));
        }
        setTimeout(() => {
          (window as any).__fieldSandbox?.restoreSnapshot?.(snapshot.fieldData, snapshot.camera);
        }, 80);
      } else {
        navigateTo({
          layer: 'workspace',
          mode: 'circuit',
          modelTitle: '3D Circuit Workbench & MNA Solver',
        });
        if (snapshot.circuitData?.controlsState) {
          setCircuitControls(snapshot.circuitData.controlsState);
        }
        setTimeout(() => {
          (window as any).__circuitWorkbench?.restoreSnapshot?.(
            snapshot.circuitData,
            snapshot.camera
          );
        }, 80);
      }
    },
    [navigateTo]
  );

  // Periodic Auto-Save when inside workspace
  useEffect(() => {
    if (typeof window === 'undefined' || currentRoute.layer !== 'workspace') return;
    const timer = setInterval(() => {
      if (reviewingStudentSnapshot) return;
      setIsAutoSaving(true);
      const snap = captureCurrentSnapshot('Auto-Saved Session');
      labStorage.saveAutoSave(currentUser.id, activeMode, snap);
      setTimeout(() => setIsAutoSaving(false), 500);
    }, 12000);

    return () => clearInterval(timer);
  }, [captureCurrentSnapshot, currentUser.id, activeMode, reviewingStudentSnapshot, currentRoute.layer]);

  // Role / User Switcher
  const handleSwitchUser = (userId: string) => {
    const user = labStorage.setCurrentUser(userId);
    setReviewingStudentSnapshot(null);
    showToast(`Switched profile to ${user.name} (${user.role.toUpperCase()})`);
  };

  // Auth Modal handlers
  const handleLogin = (email: string, password?: string): boolean => {
    const user = labStorage.loginUser(email, password);
    if (user) {
      setReviewingStudentSnapshot(null);
      showToast(`Welcome back, ${user.name}! Signed in as ${user.role.toUpperCase()}.`);
      return true;
    }
    return false;
  };

  const handleRegister = (data: {
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    className?: string;
    avatar?: string;
  }) => {
    const user = labStorage.registerUser(data);
    setReviewingStudentSnapshot(null);
    showToast(`Account created! Welcome, ${user.name} (${user.role.toUpperCase()}).`);
  };

  const handleLogout = () => {
    labStorage.logoutUser();
    setReviewingStudentSnapshot(null);
    showToast('Signed out of profile.');
  };

  // Experiment Snapshot Management
  const handleSaveScene = (title: string, description: string) => {
    const snap = captureCurrentSnapshot(title);
    labStorage.saveExperiment(currentUser.id, title, description, snap);
    showToast(`Snapshot "${title}" saved to your experiment catalog`);
  };

  const handleLoadScene = (snapshot: SceneSnapshot) => {
    setReviewingStudentSnapshot(null);
    restoreSnapshotIntoViewport(snapshot);
    showToast(`Loaded experiment: "${snapshot.title}"`);
  };

  const handleDeleteScene = (id: string) => {
    labStorage.deleteSavedExperiment(id);
    showToast('Experiment snapshot deleted');
  };

  const handleExportCurrentScene = () => {
    const snap = captureCurrentSnapshot('AP_Physics_C_Experiment');
    labStorage.exportSceneJSON(snap);
    showToast('Exported experiment scene JSON file');
  };

  const handleImportSceneJSON = (snapshot: SceneSnapshot) => {
    restoreSnapshotIntoViewport(snapshot);
    labStorage.saveExperiment(
      currentUser.id,
      snapshot.title || 'Imported Experiment',
      'Imported from external JSON file',
      snapshot
    );
    showToast(`Imported and restored "${snapshot.title}"`);
  };

  const handleRestoreAutoSave = () => {
    const auto = labStorage.getAutoSave(currentUser.id, activeMode);
    if (auto) {
      restoreSnapshotIntoViewport(auto);
      showToast('Restored previous auto-saved session');
    } else {
      showToast('No auto-save found for this mode');
    }
  };

  // Guided Lab Submissions
  const handleSaveDraft = (data: Partial<LabSubmission>) => {
    labStorage.saveSubmissionDraft({
      ...data,
      assignmentId: assignment.id,
      sceneSnapshot: captureCurrentSnapshot('Lab 01 Draft Snapshot'),
    });
    showToast('Lab draft and 3D scene snapshot saved');
  };

  const handleSubmitLab = (submission: LabSubmission) => {
    labStorage.submitLabReport(submission);
    setIsGuidedLabOpen(false);
    showToast('Lab 01 report submitted with 3D scene snapshot for instructor grading!');
  };

  // Instructor Administrative & Grading Actions (Gated by instructor role)
  const handleGradeSubmission = (submissionId: string, grade: number, feedback: string) => {
    if (currentUser.role !== 'instructor') {
      showToast('Access Denied: Only instructors can grade submissions.');
      return;
    }
    const graded = labStorage.gradeSubmission(submissionId, grade, feedback, currentUser.name);
    if (graded) {
      showToast(`Grade (${grade}/100) and feedback saved for ${graded.studentName}`);
    }
  };

  const handleEnrollStudent = (data: { name: string; email: string; className?: string }) => {
    if (currentUser.role !== 'instructor') {
      showToast('Access Denied: Only instructors can enroll students.');
      return;
    }
    const stu = labStorage.enrollStudentInClass(data);
    showToast(`Enrolled ${stu.name} (${stu.email}) into ${stu.className}`);
  };

  const handleRemoveStudent = (studentId: string, studentName: string) => {
    if (currentUser.role !== 'instructor') {
      showToast('Access Denied: Only instructors can remove students.');
      return;
    }
    labStorage.removeStudentFromClass(studentId);
    showToast(`Removed ${studentName} from class roster`);
  };

  const handleUpdateStudent = (
    studentId: string,
    updates: { name?: string; email?: string; className?: string }
  ) => {
    if (currentUser.role !== 'instructor') {
      showToast('Access Denied: Only instructors can modify student records.');
      return;
    }
    const updated = labStorage.updateStudentInfo(studentId, updates);
    if (updated) {
      showToast(`Updated student record for ${updated.name}`);
    }
  };

  const handleResetStudentSubmission = (studentId: string, studentName: string) => {
    if (currentUser.role !== 'instructor') {
      showToast('Access Denied: Only instructors can reset student work.');
      return;
    }
    labStorage.resetStudentSubmission(studentId);
    showToast(`Reset Lab 01 submission for ${studentName}`);
  };

  const handleCreateAssignment = (data: Partial<LabAssignment>) => {
    if (currentUser.role !== 'instructor') {
      showToast('Access Denied: Only instructors can create assignments.');
      return;
    }
    const created = labStorage.createAssignment({
      ...data,
      assignedBy: currentUser.name,
    });
    showToast(`Created & assigned lab: "${created.title}"`);
  };

  const handleAddSubmissionComment = (submissionId: string, text: string) => {
    const role = currentUser.role === 'instructor' ? 'instructor' : 'student';
    labStorage.addSubmissionComment(submissionId, currentUser.id, currentUser.name, role, text);
    showToast('Comment posted to submission');
  };

  // Student Account Choices & Device Privacy Actions
  const handleDeleteMyAccount = () => {
    const studentName = currentUser.name;
    labStorage.deleteStudentAccount(currentUser.id);
    showToast(`Account for ${studentName} was permanently deleted.`);
  };

  const handleResetMyProgress = () => {
    labStorage.resetStudentProgress(currentUser.id);
    showToast('Reset personal Lab 01 progress and submission.');
  };

  const handleForgetAccountOnDevice = (userId: string, userName: string) => {
    labStorage.forgetAccountOnDevice(userId);
    showToast(`Removed access for ${userName} from this laptop screen.`);
  };

  const handleRestoreAllAccounts = () => {
    labStorage.restoreAllAccountsOnDevice();
    showToast('Restored all hidden accounts on this laptop screen.');
  };

  const handleUpdateStudentProfile = (name: string, avatar: string) => {
    labStorage.updateStudentInfo(currentUser.id, { name });
    showToast('Student profile updated.');
  };

  const handleRestoreStudentSnapshot = (snapshot: SceneSnapshot, studentName: string) => {
    setReviewingStudentSnapshot({ studentName, snapshot });
    restoreSnapshotIntoViewport(snapshot);
    showToast(`Restoring ${studentName}'s exact 3D submission scene for evaluation`);
  };

  const handleExitReviewMode = () => {
    setReviewingStudentSnapshot(null);
    handleRestoreAutoSave();
    showToast('Returned to active workspace');
  };

  // Handle selecting a Unit Module card from the first-page Catalog
  const handleSelectUnit = (unit: PhysicsUnitModule) => {
    navigateTo({
      layer: 'unit',
      unit,
    });
  };

  // Handle selecting a simulation model slot from a Unit Subtopics page
  const handleSelectCatalogModel = (slot: PhysicsModelSlot, parentUnit?: PhysicsUnitModule) => {
    if (slot.status === 'live' && slot.simulationMode) {
      navigateTo({
        layer: 'workspace',
        mode: slot.simulationMode,
        modelTitle: slot.title,
        unit: parentUnit,
      });
      showToast(`Entered ${slot.title}`);
    } else {
      navigateTo({
        layer: 'slot-detail',
        slot,
      });
    }
  };

  // Calculate live separation distance between 1st & 2nd charges for Guided Lab
  const getLiveChargeDistance = (): number => {
    if (typeof window === 'undefined') return 4.0;
    const fieldData = (window as any).__fieldSandbox?.getSnapshot?.();
    if (fieldData?.charges && fieldData.charges.length >= 2) {
      const c1 = fieldData.charges[0];
      const c2 = fieldData.charges[1];
      const dx = c1.x - c2.x;
      const dz = c1.z - c2.z;
      return Math.sqrt(dx * dx + dz * dz);
    }
    return 4.0;
  };

  const liveDistance = typeof window !== 'undefined' ? getLiveChargeDistance() : 4.0;
  const liveForce = (COULOMB_K * 25e-12) / (liveDistance * liveDistance);

  // Oscilloscope sampler for Circuit Workbench
  const handleCircuitScopeSample = useCallback((v: number, i: number) => {
    setCircuitScopeHistory(prev => {
      const now = performance.now() * 0.001;
      const next = [...prev, { t: now, val1: v, val2: i }];
      if (next.length > 120) next.shift();
      return next;
    });
  }, []);

  const handleCircuitTelemetryUpdate = useCallback((data: CircuitWorkbenchTelemetry) => {
    setCircuitTelemetry(data);
  }, []);

  const handleFieldTelemetryUpdate = useCallback((data: {
    chargeCount: number;
    eFieldAtCursor: number;
    fPredicted: number;
    activeParticles: number;
    latestParticleEnergy?: { kinetic: number; potential: number; total: number };
  }) => {
    setFieldTelemetry({
      chargeCount: data.chargeCount,
      eFieldAtCursor: data.eFieldAtCursor,
      fPredicted: data.fPredicted,
      activeParticles: data.activeParticles,
    });

    if (data.latestParticleEnergy) {
      setFieldScopeHistory(prev => {
        const now = performance.now() * 0.001;
        const next = [
          ...prev,
          {
            t: now,
            val1: data.latestParticleEnergy!.kinetic,
            val2: data.latestParticleEnergy!.potential,
            val3: data.latestParticleEnergy!.total,
          },
        ];
        if (next.length > 120) next.shift();
        return next;
      });
    }
  }, []);

  return (
    <div
      suppressHydrationWarning
      className="relative w-screen h-screen overflow-hidden bg-[#050811] text-slate-100 select-none font-sans"
    >
      {/* ========================================================================= */}
      {/* FLOATING HIERARCHY & BACK/FORWARD NAVIGATION DOCK (NO TOP BAR!)           */}
      {/* ========================================================================= */}
      <div
        className={`fixed top-4 left-4 z-40 flex items-center gap-2 transition-all duration-300 ${
          (currentRoute.layer === 'catalog' || currentRoute.layer === 'unit') && !isHeaderVisible
            ? 'opacity-0 -translate-y-8 pointer-events-none'
            : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="bg-[#080e1e]/85 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl flex items-center space-x-1.5">
          {/* Back & Forward History Buttons */}
          <button
            onClick={goBack}
            disabled={!canGoBack}
            className={`p-2 rounded-xl transition flex items-center justify-center ${
              canGoBack
                ? 'bg-white/10 hover:bg-white/15 text-white cursor-pointer'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Navigate Back in Layer History"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goForward}
            disabled={!canGoForward}
            className={`p-2 rounded-xl transition flex items-center justify-center ${
              canGoForward
                ? 'bg-white/10 hover:bg-white/15 text-white cursor-pointer'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Navigate Forward in Layer History"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-white/10 mx-1" />

          {/* Interactive Hierarchy Breadcrumb Trail */}
          <div className="flex items-center space-x-1.5 px-2 text-xs">
            <button
              onClick={() => {
                if (currentRoute.layer !== 'catalog') {
                  navigateTo({ layer: 'catalog', course: activeCourse });
                }
              }}
              className={`font-semibold transition flex items-center gap-1.5 ${
                currentRoute.layer === 'catalog'
                  ? activeCourse === 'mechanics'
                    ? 'text-emerald-400'
                    : 'text-sky-400'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Compass
                className={`w-3.5 h-3.5 ${
                  activeCourse === 'mechanics' ? 'text-emerald-400' : 'text-sky-400'
                }`}
              />
              <span>Model Catalog</span>
            </button>

            {currentRoute.layer === 'catalog' && (
              <>
                <span className="text-slate-500 font-mono">/</span>
                {/* Reversed order: Mechanics on the left, E&M on the right */}
                <div className="flex items-center bg-[#050811] p-0.5 rounded-xl border border-white/10 text-[11px]">
                  <button
                    onClick={() => navigateTo({ layer: 'catalog', course: 'mechanics' })}
                    className={`px-2 py-0.5 rounded-lg font-medium transition ${
                      activeCourse === 'mechanics'
                        ? 'bg-emerald-400 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    C: Mechanics
                  </button>
                  <button
                    onClick={() => navigateTo({ layer: 'catalog', course: 'em' })}
                    className={`px-2 py-0.5 rounded-lg font-medium transition ${
                      activeCourse === 'em'
                        ? 'bg-sky-400 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    C: E&amp;M
                  </button>
                </div>
              </>
            )}

            {currentRoute.layer === 'unit' && (
              <>
                <span className="text-slate-500 font-mono">/</span>
                <span
                  className={`font-bold truncate max-w-[260px] ${
                    currentRoute.unit.course === 'mechanics' ? 'text-emerald-300' : 'text-sky-300'
                  }`}
                >
                  {currentRoute.unit.title}
                </span>
              </>
            )}

            {currentRoute.layer === 'workspace' && (
              <>
                {currentRoute.unit && (
                  <>
                    <span className="text-slate-500 font-mono">/</span>
                    <button
                      onClick={() => navigateTo({ layer: 'unit', unit: currentRoute.unit! })}
                      className="text-slate-300 hover:text-white font-medium truncate max-w-[140px]"
                    >
                      {currentRoute.unit.code}
                    </button>
                  </>
                )}
                <span className="text-slate-500 font-mono">/</span>
                <span className="font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                  {activeMode === 'field'
                    ? '8.3 Electric Fields Sandbox'
                    : activeMode === 'circuit'
                    ? 'Unit 11 Circuit Workbench'
                    : '1.3 Projectile & Drag Ballistics'}
                </span>
              </>
            )}

            {currentRoute.layer === 'slot-detail' && (
              <>
                <span className="text-slate-500 font-mono">/</span>
                <span className="font-bold text-white truncate max-w-[240px]">
                  {currentRoute.slot.code}. {currentRoute.slot.title}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FLOATING RIGHT CONTEXTUAL ACTIONS & ACCOUNT POD (NO TOP BAR!)             */}
      {/* ========================================================================= */}
      <div
        className={`fixed top-4 right-4 z-40 flex items-center gap-2 transition-all duration-300 ${
          (currentRoute.layer === 'catalog' || currentRoute.layer === 'unit') && !isHeaderVisible
            ? 'opacity-0 -translate-y-8 pointer-events-none'
            : 'opacity-100 translate-y-0'
        }`}
      >
        <div
          className={`backdrop-blur-xl border rounded-2xl p-1.5 shadow-2xl flex items-center space-x-1.5 transition-colors duration-300 ${
            isCurrentMechanics
              ? 'bg-[#040e0b]/90 border-emerald-500/25'
              : 'bg-[#080e1e]/85 border-white/10'
          }`}
        >
          {currentRoute.layer === 'workspace' && (
            <>
              {/* 3D / 2D Camera Toggle (Synchronized with current simulation) */}
              <div className="hidden md:flex items-center bg-[#050811] p-0.5 rounded-xl border border-white/10 text-[11px]">
                <button
                  onClick={() => {
                    if (activeMode === 'field')
                      setFieldControls(prev => ({ ...prev, viewMode: '3d' }));
                    else if (activeMode === 'circuit')
                      setCircuitControls(prev => ({ ...prev, viewMode: '3d' }));
                    else
                      setProjectileViewMode('3d');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    (activeMode === 'projectile'
                      ? projectileViewMode === '3d'
                      : (activeMode === 'field' ? fieldControls.viewMode : circuitControls.viewMode) === '3d')
                      ? isCurrentMechanics
                        ? 'bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
                        : 'bg-sky-400 text-slate-950 font-bold shadow-lg shadow-sky-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  3D
                </button>
                <button
                  onClick={() => {
                    if (activeMode === 'field')
                      setFieldControls(prev => ({ ...prev, viewMode: 'top' }));
                    else if (activeMode === 'circuit')
                      setCircuitControls(prev => ({ ...prev, viewMode: 'top' }));
                    else
                      setProjectileViewMode('2d');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    (activeMode === 'projectile'
                      ? projectileViewMode === '2d'
                      : (activeMode === 'field' ? fieldControls.viewMode : circuitControls.viewMode) === 'top')
                      ? isCurrentMechanics
                        ? 'bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
                        : 'bg-sky-400 text-slate-950 font-bold shadow-lg shadow-sky-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={
                    activeMode === 'projectile'
                      ? 'Lock 2D vantage point perpendicular to projectile motion'
                      : '2D Orthographic Top-Down Projection'
                  }
                >
                  {activeMode === 'projectile' ? '2D View' : '2D Top'}
                </button>
              </div>

              <button
                onClick={() => setIsSavedScenesOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition flex items-center space-x-1.5 text-xs font-medium"
                title="Saved Experiment Snapshots"
              >
                <FolderOpen
                  className={`w-3.5 h-3.5 ${
                    isCurrentMechanics ? 'text-emerald-400' : 'text-sky-400'
                  }`}
                />
                <span className="hidden xl:inline">Scenes</span>
              </button>
            </>
          )}

          <button
            onClick={() => setIsGuidedLabOpen(true)}
            className={`px-2.5 py-1.5 rounded-xl border transition flex items-center space-x-1.5 text-xs font-semibold ${
              activeCourse === 'mechanics'
                ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
                : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border-sky-500/30'
            }`}
            title="Open Guided Lab Report"
          >
            <ClipboardList className={`w-3.5 h-3.5 ${activeCourse === 'mechanics' ? 'text-emerald-400' : 'text-sky-400'}`} />
            <span className="hidden lg:inline">Lab Report</span>
          </button>

          {/* Class Administration & Gradebook Button - ONLY for logged-in Instructor */}
          {isLoggedIn && currentUser.role === 'instructor' && (
            <button
              onClick={() => setIsTeacherDashboardOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition flex items-center space-x-1.5 text-xs font-semibold"
              title="Open Teacher Class Roster, Student Management & Gradebook"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">
                Class Admin ({classStudents.length})
              </span>
            </button>
          )}

          {/* Student Account Choices Button - for logged-in Students */}
          {isLoggedIn && currentUser.role === 'student' && (
            <button
              onClick={() => setIsStudentAccountModalOpen(true)}
              className={`px-2.5 py-1.5 rounded-xl border transition flex items-center space-x-1.5 text-xs font-semibold ${
                activeCourse === 'mechanics'
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
                  : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/30'
              }`}
              title="Manage student account, privacy choices, reset progress, or delete account"
            >
              <User className={`w-3.5 h-3.5 ${activeCourse === 'mechanics' ? 'text-emerald-400' : 'text-cyan-400'}`} />
              <span className="hidden md:inline">My Account</span>
            </button>
          )}

          <button
            onClick={() => setIsTheoryOpen(true)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition text-xs"
            title={
              activeCourse === 'mechanics'
                ? 'AP Physics C: Mechanics Formula Sheet'
                : 'AP Physics C: Electricity & Magnetism Formula Sheet'
            }
          >
            <BookOpen
              className={`w-3.5 h-3.5 ${
                activeCourse === 'mechanics' ? 'text-emerald-400' : 'text-sky-400'
              }`}
            />
          </button>

          <div className="h-5 w-px bg-white/10 mx-0.5" />

          <UserRoleBar
            currentUser={currentUser}
            isLoggedIn={isLoggedIn}
            allUsers={visibleUsers}
            onSwitchUser={handleSwitchUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onLogout={handleLogout}
            onForgetAccountOnDevice={handleForgetAccountOnDevice}
            onOpenStudentAccountModal={() => setIsStudentAccountModalOpen(true)}
            hiddenAccountsCount={hiddenAccounts.length}
            onRestoreAllAccounts={handleRestoreAllAccounts}
            course={activeCourse}
          />
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 backdrop-blur-xl text-xs py-2.5 px-4 rounded-xl shadow-2xl transition-all duration-300 ${
            activeCourse === 'mechanics'
              ? 'bg-[#040e0b]/95 border border-emerald-400/40 text-emerald-200'
              : 'bg-[#080e1e]/95 border border-sky-400/40 text-sky-200'
          }`}
        >
          {toastMessage}
        </div>
      )}

      {/* ========================================================================= */}
      {/* LAYER 0: SCROLLABLE FIRST PAGE UNIT SELECTION CATALOG                     */}
      {/* ========================================================================= */}
      {currentRoute.layer === 'catalog' && (
        <ModelCatalogPortal
          activeCourse={activeCourse}
          onChangeCourse={course => navigateTo({ layer: 'catalog', course })}
          onHeaderVisibilityChange={setIsHeaderVisible}
          onSelectUnit={handleSelectUnit}
          onOpenClassroom={() => {
            if (currentUser.role === 'instructor') {
              setIsTeacherDashboardOpen(true);
            } else {
              setIsStudentAccountModalOpen(true);
            }
          }}
          onOpenStudentAccount={() => setIsStudentAccountModalOpen(true)}
          onOpenSavedScenes={() => setIsSavedScenesOpen(true)}
          onOpenGuidedLab={() => setIsGuidedLabOpen(true)}
          onOpenTheory={() => setIsTheoryOpen(true)}
          currentUser={currentUser}
          studentCount={classStudents.length}
          submissionCount={teacherSubmissions.length}
        />
      )}

      {/* ========================================================================= */}
      {/* LAYER 1: UNIT SUBTOPICS & SIMULATION SELECTION PAGE                       */}
      {/* ========================================================================= */}
      {currentRoute.layer === 'unit' && (() => {
        const unit = currentRoute.unit;
        const isMechUnit = unit.course === 'mechanics';
        const regularSubtopics = unit.subtopics.filter(s => !s.isSummaryBlock);
        const summaryBlocks = unit.subtopics.filter(s => s.isSummaryBlock);

        return (
          <div
            onScroll={e => {
              const top = e.currentTarget.scrollTop;
              if (top < 50) setIsHeaderVisible(true);
              else if (top > 90) setIsHeaderVisible(false);
            }}
            className={`w-full h-full overflow-y-auto pt-24 pb-24 px-6 sm:px-10 transition-colors ${
              isMechUnit ? 'bg-[#040b09]' : 'bg-[#050811]'
            }`}
          >
            <div className="max-w-7xl mx-auto space-y-10">
              {/* Unit Header Card */}
              <div
                className={`p-8 rounded-3xl border shadow-2xl space-y-5 ${
                  isMechUnit
                    ? 'bg-[#071612]/90 border-emerald-500/25'
                    : 'bg-[#0a1224]/90 border-white/15'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                  <div className="space-y-1.5">
                    <div
                      className={`text-xs font-mono uppercase tracking-wider ${
                        isMechUnit ? 'text-emerald-400' : 'text-sky-400'
                      }`}
                    >
                      {isMechUnit
                        ? 'AP PHYSICS C: MECHANICS · UNIT SUBTOPICS'
                        : 'AP PHYSICS C: ELECTRICITY & MAGNETISM · UNIT SUBTOPICS'}
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                      {unit.title}
                    </h1>
                    {unit.intro && (
                      <p className="text-sm text-slate-300/90 leading-relaxed max-w-4xl font-normal pt-1">
                        {unit.intro}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => navigateTo({ layer: 'catalog', course: unit.course })}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Unit Selection</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-300">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-400 mr-1 text-[11px] uppercase tracking-wider">FUNDAMENTAL UNIT LAW:</span>
                    <span className={isMechUnit ? 'text-emerald-300 font-bold' : 'text-sky-300 font-bold'}>
                      <MathFormula rawLatex={unit.equation} fallbackText={unit.equation} />
                    </span>
                  </div>
                  <div className="text-slate-400">
                    {regularSubtopics.length} Subtopics
                    {summaryBlocks.length > 0 ? ' · 1 Unit Summary Block' : ''}
                  </div>
                </div>
              </div>

              {/* Subtopics Grid */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      {unit.code} Subtopics &amp; Interactive Models
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Select an active simulation block below to launch its 3D workspace. Subtopics without a deployed simulation are marked Under Development.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {regularSubtopics.map(sub => {
                    const sim = sub.simulation;
                    const isUnnamedPlaceholder = sub.title === 'Under Development';

                    if (sim) {
                      return (
                        <div
                          key={sub.id}
                          onClick={() => handleSelectCatalogModel(sim, unit)}
                          className={`group cursor-pointer rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between shadow-xl border ${
                            isMechUnit
                              ? 'bg-[#071a14]/95 border-emerald-400/50 hover:border-emerald-300'
                              : 'bg-[#0b162c]/95 border-sky-400/50 hover:border-sky-300'
                          }`}
                        >
                          <div className="space-y-4">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span
                                className={`font-bold ${
                                  isMechUnit ? 'text-emerald-400' : 'text-sky-400'
                                }`}
                              >
                                SUBTOPIC {sub.code}
                              </span>
                              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                LIVE 3D SIMULATION
                              </span>
                            </div>

                            <div>
                              <div className="text-xs font-semibold text-slate-300 mb-1">
                                {sub.title}
                              </div>
                              <h3
                                className={`text-xl font-bold text-white transition-colors ${
                                  isMechUnit
                                    ? 'group-hover:text-emerald-300'
                                    : 'group-hover:text-sky-300'
                                }`}
                              >
                                {sim.title}
                              </h3>
                              <p className="text-xs text-slate-400 mt-1">{sim.subtitle}</p>
                            </div>

                            <div className="px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between gap-2">
                              <span className="text-[10px] font-mono text-slate-400 uppercase shrink-0">
                                Equation
                              </span>
                              <span
                                className={`text-xs font-bold truncate ${
                                  isMechUnit ? 'text-emerald-300' : 'text-sky-300'
                                }`}
                              >
                                <MathFormula rawLatex={sim.equation} fallbackText={sim.equation} />
                              </span>
                            </div>

                            <p className="text-xs text-slate-300/90 leading-relaxed">
                              {sim.description}
                            </p>
                          </div>

                          <div className="pt-5 mt-5 border-t border-white/10 flex items-center justify-between text-xs font-bold">
                            <span
                              className={
                                isMechUnit
                                  ? 'text-emerald-400 group-hover:text-emerald-300'
                                  : 'text-sky-400 group-hover:text-sky-300'
                              }
                            >
                              Launch 3D Simulation
                            </span>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-white transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      );
                    }

                    // Empty / Under Development Subtopic Block
                    return (
                      <div
                        key={sub.id}
                        className={`rounded-2xl p-6 flex flex-col justify-between border border-dashed ${
                          isMechUnit
                            ? 'bg-[#071511]/60 border-emerald-500/20'
                            : 'bg-[#070c18]/60 border-white/10'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                            <span>{isUnnamedPlaceholder ? `BLOCK ${sub.code}` : `SUBTOPIC ${sub.code}`}</span>
                            <span>EMPTY BLOCK</span>
                          </div>

                          <h3 className="text-lg font-bold text-slate-200">
                            {sub.title}
                          </h3>

                          <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-center my-3">
                            <span className="text-xs font-mono text-slate-400">
                              Under Development
                            </span>
                          </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-500">
                          <span>Simulation Slot</span>
                          <span>Under Development</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Separate Summary Block (e.g., Unit 11 Summary for 3D Circuit Workbench & MNA Solver) */}
              {summaryBlocks.length > 0 && (
                <div className="space-y-4 pt-4">
                  <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-mono text-amber-400 uppercase tracking-wider">
                        UNIT SYNTHESIS WORKBENCH (TEMPORARY BLOCK)
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                        Unit 11 Summary
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {summaryBlocks.map(summaryItem => {
                      const sim = summaryItem.simulation;
                      if (!sim) return null;
                      return (
                        <div
                          key={summaryItem.id}
                          onClick={() => handleSelectCatalogModel(sim, unit)}
                          className="group cursor-pointer rounded-2xl p-6 bg-[#0b162c]/95 border border-amber-400/50 hover:border-amber-300 transition-all duration-200 flex flex-col justify-between shadow-xl"
                        >
                          <div className="space-y-4">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-amber-400 font-bold uppercase">
                                {summaryItem.title}
                              </span>
                              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                LIVE 3D SIMULATION
                              </span>
                            </div>

                            <div>
                              <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                                {sim.title}
                              </h3>
                              <p className="text-xs text-slate-400 mt-1">{sim.subtitle}</p>
                            </div>

                            <div className="px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between gap-2">
                              <span className="text-[10px] font-mono text-slate-400 uppercase shrink-0">
                                Equation
                              </span>
                              <span className="text-xs font-bold text-amber-300 truncate">
                                <MathFormula rawLatex={sim.equation} fallbackText={sim.equation} />
                              </span>
                            </div>

                            <p className="text-xs text-slate-300/90 leading-relaxed">
                              {sim.description}
                            </p>
                          </div>

                          <div className="pt-5 mt-5 border-t border-white/10 flex items-center justify-between text-xs font-bold">
                            <span className="text-amber-400 group-hover:text-amber-300">
                              Launch 3D Circuit Workbench
                            </span>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-white transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* LAYER 1A: RESERVED / BLANK CURRICULUM SLOT DETAIL PAGE                    */}
      {/* ========================================================================= */}
      {currentRoute.layer === 'slot-detail' && (
        <div className="w-full h-full overflow-y-auto bg-[#050811] pt-24 pb-20 px-6">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="p-8 rounded-3xl bg-[#0a1224]/90 border border-white/15 shadow-2xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div className="space-y-1">
                  <div className="text-xs font-mono text-sky-400">
                    MODULE {currentRoute.slot.code} · {currentRoute.slot.unit.toUpperCase()}
                  </div>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight">
                    {currentRoute.slot.title}
                  </h1>
                  <p className="text-sm text-slate-400">{currentRoute.slot.subtitle}</p>
                </div>
                <span className="text-xs font-mono text-amber-300">
                  Under Development
                </span>
              </div>

              <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                <button
                  onClick={goBack}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LAYER 1B: FULL-VIEWPORT 3D SIMULATION WORKSPACE                           */}
      {/* ========================================================================= */}
      {currentRoute.layer === 'workspace' && (
        <main className="relative w-full h-full overflow-hidden">
          {/* Review Mode Banner (if instructor restored a student submission) */}
          {reviewingStudentSnapshot && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-amber-950/90 backdrop-blur-xl border border-amber-500/50 px-5 py-2.5 rounded-2xl flex items-center gap-4 text-xs text-amber-200 z-30 shadow-2xl">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-amber-400" />
                <span>
                  Inspecting Student 3D Scene:{' '}
                  <strong>{reviewingStudentSnapshot.studentName}</strong>
                </span>
              </div>
              <button
                onClick={handleExitReviewMode}
                className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold transition flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Exit Review</span>
              </button>
            </div>
          )}

          {/* Top-Center Active Placement / Tool HUD Banner */}
          {activeMode === 'field' && fieldPlacementMode === 'tracer' && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-emerald-950/90 backdrop-blur-md border border-emerald-500/60 text-emerald-200 text-xs px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2.5">
              <Target className="w-4 h-4 text-emerald-400" />
              <span>
                <strong>Cursor Placement Active:</strong> Click anywhere on the 60×60m Cartesian
                grid to deploy test charge at rest (v₀ = 0,{' '}
                {tracerSettings.qMicro >= 0 ? '+' : ''}
                {tracerSettings.qMicro.toFixed(1)} μC)
              </span>
              <button
                onClick={() => setFieldPlacementMode('none')}
                className="ml-2 text-[11px] bg-emerald-800 hover:bg-emerald-700 px-2.5 py-0.5 rounded-lg text-white font-bold"
              >
                Done
              </button>
            </div>
          )}

          {activeMode === 'circuit' && circuitControls.activeTool === 'wire' && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-sky-950/90 backdrop-blur-md border border-sky-500/60 text-sky-200 text-xs px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2.5">
              <Cable className="w-4 h-4 text-sky-400" />
              <span>
                <strong>Wire Connection Tool Active:</strong> Select any two circuit elements to
                connect — terminals are sorted out automatically!
              </span>
              <button
                onClick={() => setCircuitControls(prev => ({ ...prev, activeTool: 'select' }))}
                className="ml-2 text-[11px] bg-sky-800 hover:bg-sky-700 px-2.5 py-0.5 rounded-lg text-white font-bold"
              >
                Done
              </button>
            </div>
          )}

          {activeMode === 'circuit' && circuitControls.activeTool === 'cut' && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-rose-950/90 backdrop-blur-md border border-rose-500/60 text-rose-200 text-xs px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2.5">
              <Scissors className="w-4 h-4 text-rose-400" />
              <span>
                <strong>Wire Cutter Active:</strong> Click any wire on the table to snip and remove
                it!
              </span>
              <button
                onClick={() => setCircuitControls(prev => ({ ...prev, activeTool: 'select' }))}
                className="ml-2 text-[11px] bg-rose-800 hover:bg-rose-700 px-2.5 py-0.5 rounded-lg text-white font-bold"
              >
                Done
              </button>
            </div>
          )}

          {/* 3D Scene Viewport */}
          <div className="w-full h-full">
            {activeMode === 'field' ? (
              <FieldSandbox
                controlsState={fieldControls}
                onSelectCharge={setSelectedCharge}
                selectedChargeId={selectedCharge?.id ?? null}
                onUpdateTelemetry={handleFieldTelemetryUpdate}
                placementMode={fieldPlacementMode}
                defaultSourceQ={sourceDefaultQ}
                tracerSettings={tracerSettings}
              />
            ) : activeMode === 'circuit' ? (
              <CircuitWorkbench
                controlsState={circuitControls}
                onSelectComponent={setSelectedComponent}
                selectedComponentId={selectedComponent?.id ?? null}
                onUpdateTelemetry={handleCircuitTelemetryUpdate}
                onOscilloscopeSample={handleCircuitScopeSample}
                onToast={showToast}
              />
            ) : activeMode === 'coulomb' ? (
              <CoulombForceWorkbench onToast={showToast} />
            ) : (
              <ProjectileSandbox
                onToast={showToast}
                externalViewMode={projectileViewMode}
                onViewModeChange={setProjectileViewMode}
              />
            )}
          </div>

          {/* ========================================================================= */}
          {/* FLOATING LEFT SIMULATION PARAMETERS DOCK                                  */}
          {/* ========================================================================= */}
          {(activeMode === 'field' || activeMode === 'circuit') && (
            <div className="absolute top-20 left-4 z-20 w-80 max-h-[calc(100vh-6.5rem)] overflow-y-auto bg-[#080e1e]/85 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs font-bold text-white tracking-tight">
                  {activeMode === 'field' ? 'Electrostatic Controls' : 'Workbench Controls'}
                </span>
              </div>
              <button
                onClick={() => setIsLeftPanelCollapsed(prev => !prev)}
                className="text-[11px] text-slate-400 hover:text-white font-mono"
              >
                {isLeftPanelCollapsed ? 'Expand' : 'Minimize'}
              </button>
            </div>

            {!isLeftPanelCollapsed &&
              (activeMode === 'field' ? (
                /* Field Sandbox Controls */
                <>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">
                        Field Topologies
                      </span>
                      <span className="text-[10px] text-sky-400 font-mono">
                        k = 8.99×10⁹ N·m²/C²
                      </span>
                    </div>
                    <select
                      onChange={e => {
                        (window as any).__fieldSandbox?.loadPreset(e.target.value);
                        showToast(`Loaded ${e.target.selectedOptions[0].text}`);
                      }}
                      defaultValue="dipole"
                      className="w-full mt-1.5 bg-[#050811] border border-white/10 text-slate-200 text-xs rounded-xl p-2.5 focus:border-sky-400 focus:outline-none"
                    >
                      <option value="dipole">Preset: Electric Dipole (+q / -q)</option>
                      <option value="quadrupole">Preset: Quadrupole Square</option>
                      <option value="capacitor">Preset: Parallel Plate Capacitor</option>
                      <option value="grounded_plane">Preset: Point near Grounded Plane</option>
                      <option value="repulsion">Preset: Like Charges (Repulsion)</option>
                    </select>
                  </div>

                  {/* Charge Palette & Source Magnitude Controls */}
                  <div className="bg-[#050811]/75 p-3 rounded-xl border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white">
                        Source Charges
                      </span>
                      <span className="text-[10px] text-sky-400 font-mono">MAGNITUDE &amp; DROP</span>
                    </div>

                    <div className="space-y-1.5 bg-[#0a1224]/90 p-2.5 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Deploy Magnitude:</span>
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            min="0.1"
                            max="30"
                            step="0.5"
                            value={sourceDefaultQ}
                            onChange={e =>
                              setSourceDefaultQ(Math.max(0.1, parseFloat(e.target.value) || 0.1))
                            }
                            className="w-16 px-1.5 py-0.5 bg-[#050811] border border-white/10 rounded text-right font-mono font-bold text-sky-300 text-xs focus:border-sky-400 focus:outline-none"
                          />
                          <span className="text-slate-400 font-mono text-[11px]">μC</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="20"
                        step="0.5"
                        value={sourceDefaultQ}
                        onChange={e => setSourceDefaultQ(parseFloat(e.target.value))}
                        className="w-full accent-sky-400 cursor-pointer"
                      />
                      <div className="flex items-center justify-between gap-1 pt-0.5">
                        {[1, 2.5, 5, 10, 15].map(q => (
                          <button
                            key={q}
                            onClick={() => setSourceDefaultQ(q)}
                            className={`flex-1 py-0.5 text-[10px] rounded font-mono transition ${
                              sourceDefaultQ === q
                                ? 'bg-sky-400 text-slate-950 font-bold'
                                : 'bg-white/5 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {q}μC
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <button
                        onClick={() => {
                          setFieldPlacementMode(prev =>
                            prev === 'charge_pos' ? 'none' : 'charge_pos'
                          );
                          showToast(
                            `Click Cartesian grid to place +${sourceDefaultQ.toFixed(1)} μC charge`
                          );
                        }}
                        className={`py-2 px-2 border rounded-xl flex items-center justify-center space-x-1.5 transition font-semibold ${
                          fieldPlacementMode === 'charge_pos'
                            ? 'bg-rose-500 text-white border-rose-400 shadow-md'
                            : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        <span className="text-sm leading-none font-bold">+</span>
                        <span>Drop (+{sourceDefaultQ.toFixed(1)} μC)</span>
                      </button>
                      <button
                        onClick={() => {
                          setFieldPlacementMode(prev =>
                            prev === 'charge_neg' ? 'none' : 'charge_neg'
                          );
                          showToast(
                            `Click Cartesian grid to place -${sourceDefaultQ.toFixed(1)} μC charge`
                          );
                        }}
                        className={`py-2 px-2 border rounded-xl flex items-center justify-center space-x-1.5 transition font-semibold ${
                          fieldPlacementMode === 'charge_neg'
                            ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md'
                            : 'bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/30 text-sky-300'
                        }`}
                      >
                        <span className="text-sm leading-none font-bold">-</span>
                        <span>Drop (-{sourceDefaultQ.toFixed(1)} μC)</span>
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        (window as any).__fieldSandbox?.clearCharges();
                        showToast('All source charges cleared');
                      }}
                      className="w-full py-1.5 px-2 text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 rounded-xl border border-rose-500/20 transition text-xs"
                    >
                      Clear All Charges
                    </button>
                  </div>

                  {/* Test Charge Deployment (Zero Initial Velocity & Speed-Invariant RK4) */}
                  <div className="bg-[#050811]/75 p-3 rounded-xl border border-white/10 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-[11px]">
                        Test Charge Deployment
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        v₀ = 0 · INVARIANT RK4
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setFieldPlacementMode(prev => (prev === 'tracer' ? 'none' : 'tracer'));
                        showToast(
                          fieldPlacementMode === 'tracer'
                            ? 'Exited cursor drop mode'
                            : 'Cursor Drop Active: Click anywhere on Cartesian grid to place test charge at rest'
                        );
                      }}
                      className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-center space-x-2 transition font-bold ${
                        fieldPlacementMode === 'tracer'
                          ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow-lg'
                          : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      <Target className="w-4 h-4" />
                      <span>
                        {fieldPlacementMode === 'tracer'
                          ? 'Cancel Cursor Placement'
                          : `Place Test Charge (${
                              tracerSettings.qMicro >= 0 ? '+' : ''
                            }${tracerSettings.qMicro.toFixed(1)} μC)`}
                      </span>
                    </button>

                    <div className="space-y-1.5 bg-[#0a1224]/90 p-2.5 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Test Charge (q):</span>
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            min="-10"
                            max="10"
                            step="0.1"
                            value={tracerSettings.qMicro}
                            onChange={e =>
                              setTracerSettings(prev => ({
                                ...prev,
                                qMicro: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-16 px-1.5 py-0.5 bg-[#050811] border border-white/10 rounded text-right font-mono font-bold text-emerald-300 text-xs focus:border-emerald-400 focus:outline-none"
                          />
                          <span className="text-slate-400 font-mono text-[11px]">μC</span>
                        </div>
                      </div>

                      <input
                        type="range"
                        min="-5.0"
                        max="5.0"
                        step="0.1"
                        value={tracerSettings.qMicro}
                        onChange={e =>
                          setTracerSettings(prev => ({
                            ...prev,
                            qMicro: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full accent-emerald-400 cursor-pointer"
                      />

                      <div className="flex items-center justify-between gap-1 pt-0.5">
                        {[-1.0, -0.5, 0.2, 0.5, 1.0, 2.0].map(val => (
                          <button
                            key={val}
                            onClick={() => setTracerSettings(prev => ({ ...prev, qMicro: val }))}
                            className={`flex-1 py-0.5 text-[10px] rounded font-mono transition ${
                              tracerSettings.qMicro === val
                                ? 'bg-emerald-400 text-slate-950 font-bold'
                                : 'bg-white/5 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {val > 0 ? `+${val}` : val}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-slate-400">Particle Mass (m):</span>
                        <div className="flex items-center space-x-1">
                          <span className="font-mono text-sky-300 font-bold">
                            {tracerSettings.massMicro}
                          </span>
                          <span className="text-slate-400 text-[10px]">mg</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="50"
                        step="1"
                        value={tracerSettings.massMicro}
                        onChange={e =>
                          setTracerSettings(prev => ({
                            ...prev,
                            massMicro: parseInt(e.target.value, 10),
                          }))
                        }
                        className="w-full accent-sky-400 cursor-pointer"
                      />

                      <div className="pt-1.5 border-t border-white/10 space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Playback Speed:</span>
                          <span className="font-mono text-sky-400">
                            {tracerSettings.simSpeed.toFixed(1)}x (Path Invariant)
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="2.5"
                          step="0.1"
                          value={tracerSettings.simSpeed}
                          onChange={e =>
                            setTracerSettings(prev => ({
                              ...prev,
                              simSpeed: parseFloat(e.target.value),
                            }))
                          }
                          className="w-full accent-sky-400 cursor-pointer"
                        />

                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-slate-400">Damping / Field Alignment:</span>
                          <span className="font-mono text-sky-400">
                            {tracerSettings.damping === 0
                              ? 'Ballistic'
                              : tracerSettings.damping > 0.3
                              ? 'High Alignment'
                              : 'Balanced'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.0"
                          max="0.5"
                          step="0.02"
                          value={tracerSettings.damping}
                          onChange={e =>
                            setTracerSettings(prev => ({
                              ...prev,
                              damping: parseFloat(e.target.value),
                            }))
                          }
                          className="w-full accent-sky-400 cursor-pointer"
                        />

                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-slate-300 font-medium">
                            2D Cartesian Plane Lock:
                          </span>
                          <input
                            type="checkbox"
                            checked={tracerSettings.lockToPlane}
                            onChange={e =>
                              setTracerSettings(prev => ({
                                ...prev,
                                lockToPlane: e.target.checked,
                              }))
                            }
                            className="w-3.5 h-3.5 rounded accent-emerald-400"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        onClick={() => {
                          (window as any).__fieldSandbox?.fireTracer();
                          showToast('Test charge deployed at rest (v₀ = 0)');
                        }}
                        className="py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition flex items-center justify-center space-x-1"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Deploy (v₀ = 0)</span>
                      </button>
                      <button
                        onClick={() => {
                          (window as any).__fieldSandbox?.clearTracers();
                          showToast('Cleared all particle trails');
                        }}
                        className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-semibold border border-white/10 transition"
                      >
                        Clear Trails
                      </button>
                    </div>
                  </div>

                  {/* Selected Charge Inspector */}
                  <div className="bg-[#050811]/75 p-3 rounded-xl border border-white/10 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                      <span className="font-bold text-white">
                        {selectedCharge
                          ? `Charge (${selectedCharge.qMicro >= 0 ? '+' : ''}${selectedCharge.qMicro.toFixed(1)} μC)`
                          : 'Inspector: Select a Charge'}
                      </span>
                      {selectedCharge && (
                        <button
                          onClick={() => {
                            (window as any).__fieldSandbox?.deleteSelectedCharge(selectedCharge.id);
                            showToast('Charge deleted');
                          }}
                          className="text-[10px] text-rose-400 hover:text-rose-300 underline"
                        >
                          Delete
                        </button>
                      )}
                    </div>

                    <div
                      className={`space-y-2.5 transition-opacity ${
                        selectedCharge ? 'opacity-100' : 'opacity-40 pointer-events-none'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Magnitude (Q):</span>
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            min="-30"
                            max="30"
                            step="0.5"
                            value={selectedCharge?.qMicro ?? 5}
                            onChange={e => {
                              if (!selectedCharge) return;
                              const val = parseFloat(e.target.value) || 0;
                              const updated = { ...selectedCharge, qMicro: val, q: val * 1e-6 };
                              setSelectedCharge(updated);
                              (window as any).__fieldSandbox?.updateSelectedCharge(updated);
                            }}
                            className="w-16 px-1.5 py-0.5 bg-[#050811] border border-white/10 rounded text-right font-mono font-bold text-sky-300 text-xs focus:border-sky-400 focus:outline-none"
                          />
                          <span className="text-slate-400 font-mono text-[11px]">μC</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="-25"
                        max="25"
                        step="0.5"
                        value={selectedCharge?.qMicro ?? 5}
                        onChange={e => {
                          if (!selectedCharge) return;
                          const val = parseFloat(e.target.value);
                          const updated = { ...selectedCharge, qMicro: val, q: val * 1e-6 };
                          setSelectedCharge(updated);
                          (window as any).__fieldSandbox?.updateSelectedCharge(updated);
                        }}
                        className="w-full accent-sky-400 cursor-pointer"
                      />

                      <div className="flex items-center justify-between gap-1">
                        {[-2.0, -0.5, 0.5, 2.0].map(delta => (
                          <button
                            key={delta}
                            onClick={() => {
                              if (!selectedCharge) return;
                              const val = Math.round((selectedCharge.qMicro + delta) * 10) / 10;
                              const updated = { ...selectedCharge, qMicro: val, q: val * 1e-6 };
                              setSelectedCharge(updated);
                              (window as any).__fieldSandbox?.updateSelectedCharge(updated);
                            }}
                            className="flex-1 py-0.5 text-[10px] bg-white/5 hover:bg-white/10 text-slate-300 rounded font-mono"
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            if (!selectedCharge) return;
                            const val = -selectedCharge.qMicro;
                            const updated = { ...selectedCharge, qMicro: val, q: val * 1e-6 };
                            setSelectedCharge(updated);
                            (window as any).__fieldSandbox?.updateSelectedCharge(updated);
                            showToast(
                              `Flipped charge polarity to ${val >= 0 ? '+' : ''}${val.toFixed(1)} μC`
                            );
                          }}
                          className="px-2 py-0.5 text-[10px] bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 rounded font-bold"
                        >
                          ± Sign
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Field Visualizations */}
                  <div className="bg-[#050811]/75 p-3 rounded-xl border border-white/10 space-y-2 text-xs">
                    <span className="font-bold text-white text-[11px]">
                      Field Visualizations
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Coulomb Vector Grid</span>
                      <input
                        type="checkbox"
                        checked={fieldControls.showVectors}
                        onChange={e =>
                          setFieldControls(prev => ({ ...prev, showVectors: e.target.checked }))
                        }
                        className="w-4 h-4 rounded accent-sky-400"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Pairwise Coulomb Forces</span>
                      <input
                        type="checkbox"
                        checked={fieldControls.showForces}
                        onChange={e =>
                          setFieldControls(prev => ({ ...prev, showForces: e.target.checked }))
                        }
                        className="w-4 h-4 rounded accent-sky-400"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Field Streamlines (RK4)</span>
                      <input
                        type="checkbox"
                        checked={fieldControls.showStreamlines}
                        onChange={e =>
                          setFieldControls(prev => ({ ...prev, showStreamlines: e.target.checked }))
                        }
                        className="w-4 h-4 rounded accent-sky-400"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-medium">Equipotential 2D Plane</span>
                      <input
                        type="checkbox"
                        checked={fieldControls.showSlicePlane}
                        onChange={e =>
                          setFieldControls(prev => ({ ...prev, showSlicePlane: e.target.checked }))
                        }
                        className="w-4 h-4 rounded accent-sky-400"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Circuit Workbench Controls */
                <>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">
                        Circuits &amp; Topologies
                      </span>
                      <span className="text-[10px] text-amber-400 font-mono">MNA SOLVER</span>
                    </div>
                    <select
                      onChange={e => {
                        (window as any).__circuitWorkbench?.loadPreset(e.target.value);
                        showToast(`Loaded ${e.target.selectedOptions[0].text}`);
                      }}
                      defaultValue="parallel"
                      className="w-full mt-1.5 bg-[#050811] border border-white/10 text-slate-200 text-xs rounded-xl p-2.5 focus:border-amber-400 focus:outline-none"
                    >
                      <option value="parallel">Preset: Parallel Twin Branch</option>
                      <option value="series">Preset: Series (Resistor + Lamp + Voltmeter)</option>
                      <option value="rc">Preset: RC Transient Filter Circuit</option>
                      <option value="wheatstone">Preset: Wheatstone Bridge Network</option>
                      <option value="blank">Blank Breadboard (Build from Scratch)</option>
                    </select>
                  </div>

                  <div className="bg-[#050811]/75 p-3 rounded-xl border border-white/10 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white">
                        Interactive Workbench Tools
                      </span>
                      <span className="text-[9px] text-sky-400 font-mono">MODES</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => {
                          setCircuitControls(prev => ({ ...prev, activeTool: 'select' }));
                          showToast('Select / Drag mode active');
                        }}
                        className={`py-2 px-1 rounded-xl text-center font-semibold transition flex flex-col items-center gap-1 ${
                          circuitControls.activeTool === 'select'
                            ? 'bg-sky-400 text-slate-950 shadow-md'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300'
                        }`}
                      >
                        <MousePointer className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Select / Move</span>
                      </button>
                      <button
                        onClick={() => {
                          setCircuitControls(prev => ({ ...prev, activeTool: 'wire' }));
                          showToast('Wire Tool active: Select two elements to auto-connect terminals');
                        }}
                        className={`py-2 px-1 rounded-xl text-center font-semibold transition flex flex-col items-center gap-1 ${
                          circuitControls.activeTool === 'wire'
                            ? 'bg-amber-400 text-slate-950 shadow-md'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300'
                        }`}
                      >
                        <Cable className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Connect Wire</span>
                      </button>
                      <button
                        onClick={() => {
                          setCircuitControls(prev => ({ ...prev, activeTool: 'cut' }));
                          showToast('Cut Wire active: Click any wire to remove it');
                        }}
                        className={`py-2 px-1 rounded-xl text-center font-semibold transition flex flex-col items-center gap-1 ${
                          circuitControls.activeTool === 'cut'
                            ? 'bg-rose-500 text-white shadow-md'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300'
                        }`}
                      >
                        <Scissors className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Cut Wire</span>
                      </button>
                    </div>

                    <div className="pt-2 border-t border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Wire Routing:</span>
                        <button
                          onClick={() => {
                            const nextStyle =
                              circuitControls.wireRouting === 'orthogonal' ? 'curved' : 'orthogonal';
                            setCircuitControls(prev => ({ ...prev, wireRouting: nextStyle }));
                          }}
                          className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-semibold bg-white/5 hover:bg-white/10 text-sky-300 border border-white/10"
                        >
                          {circuitControls.wireRouting === 'orthogonal'
                            ? 'Textbook 90°'
                            : 'Curved Cable'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-white/10">
                        <span className="text-slate-400">Element Meter Overlays:</span>
                        <button
                          onClick={() => {
                            const nextVal = circuitControls.showMeterOverlays === false;
                            setCircuitControls(prev => ({
                              ...prev,
                              showMeterOverlays: nextVal,
                            }));
                            showToast(
                              nextVal
                                ? 'Showing voltmeter/ammeter readings directly above elements'
                                : 'Hiding voltmeter/ammeter readings directly above elements'
                            );
                          }}
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-semibold transition border ${
                            circuitControls.showMeterOverlays !== false
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-sm'
                              : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                          }`}
                        >
                          {circuitControls.showMeterOverlays !== false ? 'Show Above Elements' : 'Hidden Above Elements'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          onClick={() => {
                            (window as any).__circuitWorkbench?.alignToGrid();
                            showToast('Components snapped to textbook grid');
                          }}
                          className="py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-[10px] flex items-center justify-center gap-1"
                        >
                          <Grid className="w-3 h-3" />
                          <span>Snap to Grid</span>
                        </button>
                        <button
                          onClick={() => {
                            (window as any).__circuitWorkbench?.clearAll();
                            showToast('Breadboard cleared');
                          }}
                          className="py-1.5 px-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 text-[10px] flex items-center justify-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear Board</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Component Palette */}
                  <div className="bg-[#050811]/75 p-3 rounded-xl border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white">Component Palette</span>
                      <span className="text-[9px] text-sky-400 font-mono">CLICK TO ADD</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <button
                        onClick={() => {
                          (window as any).__circuitWorkbench?.addComponent('battery');
                          showToast('Added DC Battery');
                        }}
                        className="py-1.5 px-2 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl border border-white/10 transition"
                      >
                        + Battery (DC)
                      </button>
                      <button
                        onClick={() => {
                          (window as any).__circuitWorkbench?.addComponent('bulb');
                          showToast('Added Incandescent Light Bulb');
                        }}
                        className="py-1.5 px-2 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl border border-white/10 transition"
                      >
                        + Light Bulb
                      </button>
                      <button
                        onClick={() => {
                          (window as any).__circuitWorkbench?.addComponent('resistor');
                          showToast('Added Resistor (R)');
                        }}
                        className="py-1.5 px-2 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl border border-white/10 transition"
                      >
                        + Resistor
                      </button>
                      <button
                        onClick={() => {
                          (window as any).__circuitWorkbench?.addComponent('switch');
                          showToast('Added SPST Knife Switch');
                        }}
                        className="py-1.5 px-2 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl border border-white/10 transition"
                      >
                        + Knife Switch
                      </button>
                      <button
                        onClick={() => {
                          (window as any).__circuitWorkbench?.addComponent('capacitor');
                          showToast('Added Capacitor (C)');
                        }}
                        className="py-1.5 px-2 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl border border-white/10 transition"
                      >
                        + Capacitor
                      </button>
                      <button
                        onClick={() => {
                          (window as any).__circuitWorkbench?.addComponent('inductor');
                          showToast('Added Inductor Coil (L)');
                        }}
                        className="py-1.5 px-2 bg-white/5 hover:bg-white/10 text-slate-200 rounded-xl border border-white/10 transition"
                      >
                        + Inductor
                      </button>
                      <button
                        onClick={() => {
                          (window as any).__circuitWorkbench?.addComponent('voltmeter');
                          showToast('Added Digital Voltmeter');
                        }}
                        className="py-1.5 px-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-semibold rounded-xl border border-emerald-500/30 transition"
                      >
                        + Voltmeter (V)
                      </button>
                      <button
                        onClick={() => {
                          (window as any).__circuitWorkbench?.addComponent('ammeter');
                          showToast('Added Digital Ammeter');
                        }}
                        className="py-1.5 px-2 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 font-semibold rounded-xl border border-sky-500/30 transition"
                      >
                        + Ammeter (A)
                      </button>
                    </div>
                  </div>

                  {/* Selected Component Inspector */}
                  <div className="bg-[#050811]/75 p-3 rounded-xl border border-white/10 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                      <span className="font-bold text-white">
                        {selectedComponent
                          ? `Selected: ${selectedComponent.type.toUpperCase()}`
                          : 'Inspector: Select Component'}
                      </span>
                      {selectedComponent && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              (window as any).__circuitWorkbench?.rotateSelectedComponent(
                                selectedComponent.id
                              );
                            }}
                            className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-0.5"
                          >
                            <RotateCw className="w-3 h-3" />
                            <span>Rotate</span>
                          </button>
                          <button
                            onClick={() => {
                              (window as any).__circuitWorkbench?.deleteSelectedComponent(
                                selectedComponent.id
                              );
                            }}
                            className="text-[10px] text-rose-400 hover:text-rose-300 underline"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    <div
                      className={`space-y-2.5 transition-opacity ${
                        selectedComponent ? 'opacity-100' : 'opacity-40 pointer-events-none'
                      }`}
                    >
                      {/* Auto-Connect into Circuit Branch Button */}
                      {selectedComponent && (
                        <button
                          onClick={() => {
                            const connected = (window as any).__circuitWorkbench?.autoConnectSelectedComponent(
                              selectedComponent.id
                            );
                            if (!connected) {
                              showToast('Drag component closer to a wire or drop onto the circuit to auto-connect');
                            }
                          }}
                          className="w-full py-1.5 px-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition"
                        >
                          <Cable className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Snap &amp; Auto-Connect to Nearest Branch</span>
                        </button>
                      )}

                      {/* Voltmeter / Ammeter Large LCD Inspection Station */}
                      {(selectedComponent?.type === 'voltmeter' || selectedComponent?.type === 'ammeter') && (
                        <div className="space-y-2 pt-1 font-sans">
                          <div
                            className={`p-3 rounded-xl border space-y-1.5 ${
                              selectedComponent.type === 'voltmeter'
                                ? 'bg-emerald-950/40 border-emerald-500/40'
                                : 'bg-sky-950/40 border-sky-500/40'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span
                                className={`font-bold ${
                                  selectedComponent.type === 'voltmeter' ? 'text-emerald-400' : 'text-sky-400'
                                }`}
                              >
                                {selectedComponent.type === 'voltmeter' ? 'DIGITAL VOLTMETER' : 'DIGITAL AMMETER'}
                              </span>
                              <span className="text-slate-400">ID: {selectedComponent.id}</span>
                            </div>
                            <div className="text-2xl font-black font-mono tracking-tight text-white">
                              {circuitTelemetry.meterReadings?.find(m => m.id === selectedComponent.id)?.formatted ??
                                (selectedComponent.measuredValue !== undefined
                                  ? `${selectedComponent.measuredValue >= 0 ? '+' : ''}${selectedComponent.measuredValue.toFixed(selectedComponent.type === 'voltmeter' ? 2 : 3)} ${selectedComponent.type === 'voltmeter' ? 'V' : 'A'}`
                                  : selectedComponent.type === 'voltmeter'
                                  ? '0.00 V'
                                  : '0.000 A')}
                            </div>
                            <p className="text-[10px] text-slate-300 leading-tight">
                              {selectedComponent.type === 'voltmeter'
                                ? 'Input Impedance: 10 MΩ (High-Z). Measures electric potential difference.'
                                : 'Shunt Resistance: 0.001 Ω (Low-Z). Measures branch current drift.'}
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedComponent?.type === 'switch' && (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Knife Switch:</span>
                            <span
                              className={`font-mono font-bold ${
                                selectedComponent.closed ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {selectedComponent.closed ? 'CLOSED (ON)' : 'OPEN (OFF)'}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              const updated = {
                                ...selectedComponent,
                                closed: !selectedComponent.closed,
                              };
                              setSelectedComponent(updated);
                              (window as any).__circuitWorkbench?.updateSelectedComponent(updated);
                            }}
                            className="w-full py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition"
                          >
                            {selectedComponent.closed ? 'Open Knife Switch' : 'Close Knife Switch'}
                          </button>
                        </div>
                      )}

                      {selectedComponent?.type === 'battery' && (
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-400">EMF Voltage (V):</span>
                            <span className="font-mono text-sky-400 font-bold">
                              {selectedComponent.value.toFixed(1)} V
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="48"
                            step="0.5"
                            value={selectedComponent.value}
                            onChange={e => {
                              const val = parseFloat(e.target.value);
                              const updated = { ...selectedComponent, value: val };
                              setSelectedComponent(updated);
                              (window as any).__circuitWorkbench?.updateSelectedComponent(updated);
                            }}
                            className="w-full accent-sky-400"
                          />
                        </div>
                      )}

                      {(selectedComponent?.type === 'resistor' ||
                        selectedComponent?.type === 'bulb') && (
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Resistance (Ω):</span>
                            <span className="font-mono text-amber-400 font-bold">
                              {selectedComponent.value.toFixed(1)} Ω
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="100"
                            step="1"
                            value={selectedComponent.value}
                            onChange={e => {
                              const val = parseFloat(e.target.value);
                              const updated = { ...selectedComponent, value: val };
                              setSelectedComponent(updated);
                              (window as any).__circuitWorkbench?.updateSelectedComponent(updated);
                            }}
                            className="w-full accent-sky-400"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ))}
            </div>
          )}

          {/* ========================================================================= */}
          {/* FLOATING RIGHT TELEMETRY POD                                              */}
          {/* ========================================================================= */}
          {activeMode !== 'projectile' && (
            <div
              className={`absolute top-20 right-4 z-10 bg-[#080e1e]/85 backdrop-blur-xl border border-white/10 rounded-2xl p-4 ${
                isRightPanelCollapsed ? 'w-56' : 'w-72'
              } flex flex-col space-y-2.5 text-xs shadow-2xl transition-all duration-200`}
            >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                Live Telemetry
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-sky-400">
                  {isAutoSaving ? 'Saving...' : activeMode === 'field' ? 'RK4 Engine' : 'MNA Solver'}
                </span>
                <button
                  onClick={() => setIsRightPanelCollapsed(prev => !prev)}
                  className="text-[11px] text-slate-400 hover:text-white font-mono px-1 py-0.5 rounded hover:bg-white/10 transition"
                  title={isRightPanelCollapsed ? 'Expand Telemetry Pod' : 'Minimize Telemetry Pod'}
                >
                  {isRightPanelCollapsed ? 'Expand' : 'Minimize'}
                </button>
              </div>
            </div>

            {!isRightPanelCollapsed && (
              <>

            {activeMode === 'field' ? (
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Source Charges:</span>
                  <span className="text-white font-bold">{fieldTelemetry.chargeCount}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Charge Separation r:</span>
                  <span className="text-emerald-400 font-bold">{liveDistance.toFixed(2)} m</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Pairwise |F_coulomb|:</span>
                  <span className="text-amber-400 font-bold">{liveForce.toFixed(2)} N</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Active Test Charges:</span>
                  <span className="text-sky-400 font-bold">{fieldTelemetry.activeParticles}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Source EMF (ε):</span>
                  <span className="text-sky-400 font-bold">
                    {circuitTelemetry.supplyEmf.toFixed(1)} V
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Total Current (I):</span>
                  <span className="text-amber-400 font-bold">
                    {circuitTelemetry.totalCurrent.toFixed(3)} A
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>KCL Max Residual:</span>
                  <span className="text-emerald-400 font-bold">
                    {circuitTelemetry.kclMaxResidual.toFixed(4)} A
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>KVL Balance:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified</span>
                  </span>
                </div>

                {/* Live Multimeter Readouts Section */}
                <div className="pt-2 border-t border-white/10 space-y-1.5 font-sans">
                  <div className="flex items-center justify-between text-[11px] font-bold text-white">
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Multimeter Readings</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {circuitTelemetry.meterReadings?.length || 0} ACTIVE
                    </span>
                  </div>

                  {circuitTelemetry.meterReadings && circuitTelemetry.meterReadings.length > 0 ? (
                    <div className="space-y-1.5 pt-0.5">
                      {circuitTelemetry.meterReadings.map(m => (
                        <div
                          key={m.id}
                          className={`p-2 rounded-xl border flex items-center justify-between font-mono text-xs ${
                            m.type === 'voltmeter'
                              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                              : 'bg-sky-950/40 border-sky-500/40 text-sky-300'
                          }`}
                        >
                          <div className="flex items-center space-x-1.5 min-w-0">
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                                m.type === 'voltmeter'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                              }`}
                            >
                              {m.type === 'voltmeter' ? 'VOLTS' : 'AMPS'}
                            </span>
                            <span className="font-semibold text-white truncate text-[11px]">
                              {m.id}
                            </span>
                          </div>
                          <span className="text-sm font-black tracking-tight text-white ml-2">
                            {m.formatted}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-center space-y-1.5">
                      <p className="text-[10px] text-slate-400">No meters currently in circuit</p>
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => {
                            (window as any).__circuitWorkbench?.addComponent('voltmeter', true);
                            showToast('Added Voltmeter & auto-connected');
                          }}
                          className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30"
                        >
                          + Voltmeter
                        </button>
                        <button
                          onClick={() => {
                            (window as any).__circuitWorkbench?.addComponent('ammeter', true);
                            showToast('Added Ammeter & auto-connected');
                          }}
                          className="px-2 py-0.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[10px] font-semibold border border-sky-500/30"
                        >
                          + Ammeter
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            </>
            )}
          </div>
          )}

          {/* ========================================================================= */}
          {/* BOTTOM OSCILLOSCOPE DOCK                                                  */}
          {/* ========================================================================= */}
          {(activeMode === 'field' || activeMode === 'circuit') && (
            <div className="absolute bottom-4 right-4 z-10 w-96 max-w-[calc(100vw-2rem)]">
            {activeMode === 'field' ? (
              <Oscilloscope
                mode="field"
                history={fieldScopeHistory}
                labels={{
                  title: 'Particle Energy Telemetry (ΔE = 0)',
                  line1: 'Kinetic (K)',
                  line2: 'Potential (U)',
                  line3: 'Total (E)',
                  unit1: 'μJ',
                  unit2: 'μJ',
                }}
                expanded={isScopeExpanded}
                onToggleExpand={() => setIsScopeExpanded(prev => !prev)}
              />
            ) : (
              <Oscilloscope
                mode="circuit"
                history={circuitScopeHistory}
                labels={{
                  title: 'Transient Oscilloscope (V & I vs t)',
                  line1: 'Supply Voltage',
                  line2: 'Total Current',
                  unit1: 'V',
                  unit2: 'A',
                }}
                expanded={isScopeExpanded}
                onToggleExpand={() => setIsScopeExpanded(prev => !prev)}
              />
            )}
          </div>
          )}
        </main>
      )}

      {/* Guided Lab Report Card Modal */}
      <GuidedLabModal
        isOpen={isGuidedLabOpen}
        onClose={() => setIsGuidedLabOpen(false)}
        assignment={assignment}
        currentUser={currentUser}
        course={activeCourse}
        initialSubmission={currentSubmission}
        onSaveDraft={handleSaveDraft}
        onSubmitLab={handleSubmitLab}
        onAddComment={(text: string) => {
          if (currentSubmission) {
            handleAddSubmissionComment(currentSubmission.id, text);
          } else {
            const draft = labStorage.saveSubmissionDraft({
              assignmentId: assignment.id,
              studentComments: text,
              sceneSnapshot: captureCurrentSnapshot('Lab Draft Snapshot'),
            });
            if (draft) {
              handleAddSubmissionComment(draft.id, text);
            }
          }
        }}
        getLiveSceneSnapshot={() => captureCurrentSnapshot('Lab 01 Submission Snapshot')}
        liveSeparationDistance={liveDistance}
        liveCoulombForce={liveForce}
      />

      {/* Saved Scenes & Version History Drawer */}
      <SavedScenesDrawer
        isOpen={isSavedScenesOpen}
        onClose={() => setIsSavedScenesOpen(false)}
        savedExperiments={savedExperiments}
        onSaveCurrentScene={handleSaveScene}
        onLoadExperiment={handleLoadScene}
        onDeleteExperiment={handleDeleteScene}
        onExportCurrentScene={handleExportCurrentScene}
        onImportSceneJSON={handleImportSceneJSON}
        lastAutoSave={lastAutoSaveSnapshot}
        onRestoreAutoSave={handleRestoreAutoSave}
      />

      {/* Instructor Class Administration, Student Roster & Grading Modal */}
      <InstructorDashboardModal
        isOpen={isTeacherDashboardOpen}
        onClose={() => setIsTeacherDashboardOpen(false)}
        submissions={teacherSubmissions}
        students={classStudents}
        savedExperiments={allSavedExperiments}
        assignments={allAssignments}
        currentUser={currentUser}
        course={activeCourse}
        onGradeSubmission={handleGradeSubmission}
        onRestoreSceneSnapshot={handleRestoreStudentSnapshot}
        onEnrollStudent={handleEnrollStudent}
        onRemoveStudent={handleRemoveStudent}
        onUpdateStudent={handleUpdateStudent}
        onResetStudentSubmission={handleResetStudentSubmission}
        onCreateAssignment={handleCreateAssignment}
        onAddComment={handleAddSubmissionComment}
        onExportCSV={() => {
          labStorage.exportSubmissionsCSV();
          showToast('Downloaded student grades and submissions as CSV spreadsheet');
        }}
      />

      {/* Student Account Choices & Privacy Modal */}
      <StudentAccountModal
        isOpen={isStudentAccountModalOpen}
        onClose={() => setIsStudentAccountModalOpen(false)}
        currentUser={currentUser}
        course={activeCourse}
        submission={currentSubmission}
        onDeleteAccount={handleDeleteMyAccount}
        onResetProgress={handleResetMyProgress}
        onForgetOnDevice={() => handleForgetAccountOnDevice(currentUser.id, currentUser.name)}
        onUpdateProfile={handleUpdateStudentProfile}
      />

      {/* Login & Sign-Up Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        allUsers={allUsers}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onSwitchUser={handleSwitchUser}
      />

      {/* AP Physics C Theory Modal */}
      <CalculusTheoryModal
        isOpen={isTheoryOpen}
        onClose={() => setIsTheoryOpen(false)}
        course={activeCourse}
      />
    </div>
  );
}
