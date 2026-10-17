'use client';

import React, { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react';
import {
  Zap,
  Cpu,
  RotateCcw,
  BookOpen,
  Play,
  CheckCircle2,
  AlertCircle,
  Eye,
  FolderOpen,
  ClipboardList,
  GraduationCap,
  Sparkles,
  ArrowLeft,
  Target,
  Scissors,
  Cable,
  MousePointer,
  Grid,
  Trash2,
  RotateCw,
  Sliders,
  Check,
  Plus,
} from 'lucide-react';
import { FieldSandbox, FieldSandboxControls } from '@/components/simulation/FieldSandbox';
import { CircuitWorkbench, CircuitWorkbenchControls } from '@/components/simulation/CircuitWorkbench';
import { Oscilloscope, DataPoint } from '@/components/ui/Oscilloscope';
import { CalculusTheoryModal } from '@/components/ui/CalculusTheoryModal';
import { UserRoleBar } from '@/components/auth/UserRoleBar';
import { AuthModal } from '@/components/auth/AuthModal';
import { SavedScenesDrawer } from '@/components/lab/SavedScenesDrawer';
import { GuidedLabModal } from '@/components/lab/GuidedLabModal';
import { InstructorDashboardModal } from '@/components/lab/InstructorDashboardModal';
import { SourceCharge, COULOMB_K } from '@/lib/physics/coulomb';
import { CircuitComponentData, ComponentType } from '@/lib/physics/mna-solver';
import { SlicePlaneOrientation } from '@/lib/physics/equipotential';
import { labStorage, MOCK_USERS } from '@/lib/services/labStorage';
import {
  UserProfile,
  UserRole,
  SceneSnapshot,
  SavedExperiment,
  LabSubmission,
  LabAssignment,
} from '@/lib/types/lab';

export default function SimulationCockpit() {
  // Flagship Mode: 'field' | 'circuit'
  const [activeMode, setActiveMode] = useState<'field' | 'circuit'>('field');
  const [isTheoryOpen, setIsTheoryOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auth & Roles State (deterministic SSR snapshot and reactive subscription)
  const currentUser = useSyncExternalStore(
    labStorage.subscribe,
    () => labStorage.getCurrentUser(),
    () => MOCK_USERS[1]
  );
  const allUsers = useSyncExternalStore(
    labStorage.subscribe,
    () => labStorage.getAllUsers(),
    () => MOCK_USERS
  );

  // Trigger re-render on lab storage mutations
  const [, setStorageVersion] = useState(0);
  useEffect(() => {
    return labStorage.subscribe(() => setStorageVersion(v => v + 1));
  }, []);

  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Workflow Dialogs State
  const [isSavedScenesOpen, setIsSavedScenesOpen] = useState(false);
  const [isGuidedLabOpen, setIsGuidedLabOpen] = useState(false);
  const [isTeacherDashboardOpen, setIsTeacherDashboardOpen] = useState(false);
  const [reviewingStudentSnapshot, setReviewingStudentSnapshot] = useState<{
    studentName: string;
    snapshot: SceneSnapshot;
  } | null>(null);

  // Lab Assignment & Submissions State directly derived from reactive labStorage
  const assignment = labStorage.getAssignment();
  const currentSubmission = labStorage.getSubmissionForStudent(assignment.id, currentUser.id);
  const teacherSubmissions = labStorage.getAllSubmissionsForTeacher();
  const savedExperiments = labStorage.getSavedExperiments(currentUser.role === 'student' ? currentUser.id : undefined);
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
    damping: 0.12,
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
  });

  const [selectedComponent, setSelectedComponent] = useState<CircuitComponentData | null>(null);
  const [circuitTelemetry, setCircuitTelemetry] = useState({
    supplyEmf: 9.0,
    totalCurrent: 0.0,
    activeComponents: 4,
    wireCount: 5,
    kclMaxResidual: 0.0,
    kvlVerified: true,
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

      if (activeMode === 'field') {
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
        setActiveMode('field');
        if (snapshot.fieldData?.controlsState) {
          setFieldControls(snapshot.fieldData.controlsState);
        }
        if (snapshot.fieldData?.tracerSettings) {
          const ts = snapshot.fieldData.tracerSettings;
          setTracerSettings(prev => ({
            ...prev,
            ...ts,
            damping: ts.damping ?? prev.damping,
            simSpeed: ts.simSpeed ?? prev.simSpeed,
            lockToPlane: ts.lockToPlane ?? prev.lockToPlane,
          }));
        }
        setTimeout(() => {
          (window as any).__fieldSandbox?.restoreSnapshot?.(snapshot.fieldData, snapshot.camera);
        }, 50);
      } else {
        setActiveMode('circuit');
        if (snapshot.circuitData?.controlsState) {
          setCircuitControls(snapshot.circuitData.controlsState);
        }
        setTimeout(() => {
          (window as any).__circuitWorkbench?.restoreSnapshot?.(snapshot.circuitData, snapshot.camera);
        }, 50);
      }
    },
    []
  );

  // Periodic Auto-Save
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = setInterval(() => {
      if (reviewingStudentSnapshot) return; // Do not overwrite auto-save in teacher review mode
      setIsAutoSaving(true);
      const snap = captureCurrentSnapshot('Auto-Saved Session');
      labStorage.saveAutoSave(currentUser.id, activeMode, snap);
      setTimeout(() => setIsAutoSaving(false), 500);
    }, 12000);

    return () => clearInterval(timer);
  }, [captureCurrentSnapshot, currentUser.id, activeMode, reviewingStudentSnapshot]);

  // Role / User Switcher
  const handleSwitchUser = (userId: string) => {
    const user = labStorage.setCurrentUser(userId);
    setReviewingStudentSnapshot(null);
    showToast(`Switched profile to ${user.name} (${user.role.toUpperCase()})`);
  };

  // Auth Modal handlers (Login, Sign-Up, Logout)
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

  // Instructor Actions
  const handleGradeSubmission = (submissionId: string, grade: number, feedback: string) => {
    const graded = labStorage.gradeSubmission(submissionId, grade, feedback, currentUser.name);
    if (graded) {
      showToast(`Grade (${grade}/100) and feedback saved for ${graded.studentName}`);
    }
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
  const handleCircuitScopeSample = (v: number, i: number) => {
    setCircuitScopeHistory(prev => {
      const now = performance.now() * 0.001;
      const next = [...prev, { t: now, val1: v, val2: i }];
      if (next.length > 120) next.shift();
      return next;
    });
  };

  const handleFieldTelemetryUpdate = (data: {
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
  };

  return (
    <div
      suppressHydrationWarning
      className="w-screen h-screen overflow-hidden flex flex-col bg-slate-950 text-slate-100 select-none font-sans"
    >
      {/* ========================================================================= */}
      {/* 1. UNIFIED TOP NAVIGATION HEADER & ROLE BAR (z-40, Unobstructed & Sleek)   */}
      {/* ========================================================================= */}
      <header className="h-14 w-full bg-slate-900/95 border-b border-slate-800 px-3.5 flex items-center justify-between z-40 shrink-0 gap-2 shadow-lg">
        {/* Left: Brand & Auto-Save Indicator */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="text-white font-bold text-sm">Φ</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white">AP Physics 3D Studio</h1>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 uppercase">
                AP Physics C
              </span>
              <span className="hidden xl:inline-block">
                {isAutoSaving ? (
                  <span className="text-amber-400 text-[10px] font-mono animate-pulse">● Saving...</span>
                ) : (
                  <span className="text-emerald-400 text-[10px] font-mono">● Auto-Saved</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Mode Switcher Tabs */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => {
              setActiveMode('field');
              showToast('Switched to 3D Electric Field & Potential Sandbox');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center space-x-1.5 ${
              activeMode === 'field'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Electric Field Sandbox</span>
            <span className="sm:hidden">E-Field</span>
          </button>
          <button
            onClick={() => {
              setActiveMode('circuit');
              showToast('Switched to 3D Circuit Workbench with MNA Solver');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center space-x-1.5 ${
              activeMode === 'circuit'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Circuit Workbench (MNA)</span>
            <span className="sm:hidden">Circuits</span>
          </button>
        </div>

        {/* Right: Actions, Lab Tools & Account Menu */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Camera View Mode Toggle */}
          <div className="hidden lg:flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => {
                if (activeMode === 'field') setFieldControls(prev => ({ ...prev, viewMode: '3d' }));
                else setCircuitControls(prev => ({ ...prev, viewMode: '3d' }));
              }}
              className={`px-2 py-1 rounded font-medium transition ${
                (activeMode === 'field' ? fieldControls.viewMode : circuitControls.viewMode) === '3d'
                  ? 'bg-slate-800 text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              3D
            </button>
            <button
              onClick={() => {
                if (activeMode === 'field') setFieldControls(prev => ({ ...prev, viewMode: 'top' }));
                else setCircuitControls(prev => ({ ...prev, viewMode: 'top' }));
              }}
              className={`px-2 py-1 rounded font-medium transition ${
                (activeMode === 'field' ? fieldControls.viewMode : circuitControls.viewMode) === 'top'
                  ? 'bg-slate-800 text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2D Top
            </button>
          </div>

          {/* Saved Scenes */}
          <button
            onClick={() => setIsSavedScenesOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition flex items-center space-x-1.5 text-xs font-medium"
            title="Save or Load Experiment Snapshots (JSON import/export)"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xl:inline">Saved Scenes</span>
          </button>

          {/* Guided Lab Card */}
          <button
            onClick={() => setIsGuidedLabOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-cyan-950/50 hover:bg-cyan-900/70 text-cyan-300 border border-cyan-800/60 transition flex items-center space-x-1.5 text-xs font-semibold"
            title="Open Guided Lab: Fixed Charge, Varying Distance"
          >
            <ClipboardList className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden xl:inline">Lab Report</span>
          </button>

          {/* Teacher Review Dashboard Button */}
          {currentUser.role === 'instructor' && (
            <button
              onClick={() => setIsTeacherDashboardOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-amber-950/50 hover:bg-amber-900/70 text-amber-300 border border-amber-800/60 transition flex items-center space-x-1.5 text-xs font-semibold"
              title="Review student submissions, restore 3D scenes, and submit graded feedback"
            >
              <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Review ({teacherSubmissions.length})</span>
            </button>
          )}

          {/* AP Physics C Theory Guide */}
          <button
            onClick={() => setIsTheoryOpen(true)}
            className="p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition text-xs flex items-center gap-1.5"
            title="AP Physics C Theory Guide & Formulas"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden 2xl:inline">Theory</span>
          </button>

          <div className="h-6 w-px bg-slate-800 mx-1"></div>

          {/* User Account / Role Widget (Never blocked!) */}
          <UserRoleBar
            currentUser={currentUser}
            allUsers={allUsers}
            onSwitchUser={handleSwitchUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onLogout={handleLogout}
          />
        </div>
      </header>

      {/* Review Mode Banner (if instructor restored a student submission) */}
      {reviewingStudentSnapshot && (
        <div className="bg-amber-950/80 border-b border-amber-600/60 px-4 py-2 flex items-center justify-between text-xs text-amber-200 z-20">
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-amber-400" />
            <span>
              Inspecting Read-Only 3D Snapshot: <strong>{reviewingStudentSnapshot.studentName}&apos;s Lab Submission</strong> ({reviewingStudentSnapshot.snapshot.timestamp})
            </span>
          </div>
          <button
            onClick={handleExitReviewMode}
            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit Review &amp; Return to My Sandbox</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN 3D VIEWPORT & FLOATING QUICK ACCESS CONTROLS                     */}
      {/* ========================================================================= */}
      <main className="relative flex-1 w-full h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-cyan-500/40 text-cyan-200 text-xs py-2 px-4 rounded-xl shadow-xl transition-all duration-300">
            {toastMessage}
          </div>
        )}

        {/* Top-Right Floating Quick Action Tools */}
        <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
          {activeMode === 'field' && (
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1.5 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs">
              <button
                onClick={() => {
                  setFieldPlacementMode(prev => (prev === 'tracer' ? 'none' : 'tracer'));
                  showToast(
                    fieldPlacementMode === 'tracer'
                      ? 'Exited cursor drop mode'
                      : 'Cursor Drop Active: Click anywhere on 3D grid or double-click to drop test particle'
                  );
                }}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center space-x-2 transition shadow-md ${
                  fieldPlacementMode === 'tracer'
                    ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400 shadow-emerald-500/40 animate-pulse'
                    : 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/80'
                }`}
                title="Click to drop test charges directly onto the 3D grid with your cursor"
              >
                <Target className="w-4 h-4 text-emerald-400" />
                <span>
                  {fieldPlacementMode === 'tracer' ? 'Cursor Active: Click Grid' : '🎯 Drop Test Charge with Cursor'}
                </span>
              </button>

              <button
                onClick={() => {
                  (window as any).__fieldSandbox?.clearParticles();
                  showToast('Test particle traces cleared');
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs"
                title="Clear test particle trajectories"
              >
                Clear Traces
              </button>
            </div>
          )}

          {activeMode === 'circuit' && (
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1.5 rounded-2xl shadow-2xl flex items-center space-x-1.5 text-xs">
              <button
                onClick={() => {
                  const nextTool = circuitControls.activeTool === 'wire' ? 'select' : 'wire';
                  setCircuitControls(prev => ({ ...prev, activeTool: nextTool }));
                  showToast(nextTool === 'wire' ? 'Click terminal 1, then terminal 2 to connect wire' : 'Select & Move mode active');
                }}
                className={`px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 transition ${
                  circuitControls.activeTool === 'wire'
                    ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400 shadow-amber-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <Cable className="w-3.5 h-3.5" />
                <span>Connect Wire</span>
              </button>
              <button
                onClick={() => {
                  const nextStyle = circuitControls.wireRouting === 'orthogonal' ? 'curved' : 'orthogonal';
                  setCircuitControls(prev => ({ ...prev, wireRouting: nextStyle }));
                  showToast(`Wire routing: ${nextStyle === 'orthogonal' ? 'Textbook 90° Manhattan' : 'Curved Cable'}`);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-[11px] border border-slate-700"
              >
                {circuitControls.wireRouting === 'orthogonal' ? 'Textbook 90°' : 'Curved Cable'}
              </button>
              <button
                onClick={() => {
                  (window as any).__circuitWorkbench?.alignToGrid();
                  showToast('Components snapped to textbook grid');
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1"
                title="Align all components to clean textbook grid"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Snap Grid</span>
              </button>
            </div>
          )}
        </div>

        {/* Drop Test Particle Active HUD Banner (Issue 1) */}
        {activeMode === 'field' && fieldPlacementMode === 'tracer' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-emerald-950/90 border border-emerald-500 text-emerald-200 text-xs px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2.5 animate-pulse">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>
              <strong>Cursor Placement Active:</strong> Click anywhere on the 3D Cartesian grid or double-click to drop test particle ({tracerSettings.qMicro >= 0 ? '+' : ''}{tracerSettings.qMicro.toFixed(1)} μC, {tracerSettings.massMicro} mg)
            </span>
            <button
              onClick={() => {
                setFieldPlacementMode('none');
                showToast('Exited cursor drop mode');
              }}
              className="ml-2 text-[11px] bg-emerald-800 hover:bg-emerald-700 px-2.5 py-0.5 rounded-lg text-white font-bold"
            >
              Done
            </button>
          </div>
        )}

        {/* Circuit Wiring Active HUD Banner */}
        {activeMode === 'circuit' && circuitControls.activeTool === 'wire' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-cyan-950/90 border border-cyan-500 text-cyan-200 text-xs px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2.5">
            <Cable className="w-4 h-4 text-cyan-400" />
            <span>
              <strong>Wire Connection Tool Active:</strong> Click terminal 1, then click terminal 2 to run a wire!
            </span>
            <button
              onClick={() => setCircuitControls(prev => ({ ...prev, activeTool: 'select' }))}
              className="ml-2 text-[11px] bg-cyan-800 hover:bg-cyan-700 px-2.5 py-0.5 rounded-lg text-white font-bold"
            >
              Done
            </button>
          </div>
        )}

        {/* Circuit Wire Cutter Active HUD Banner */}
        {activeMode === 'circuit' && circuitControls.activeTool === 'cut' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-rose-950/90 border border-rose-500 text-rose-200 text-xs px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2.5">
            <Scissors className="w-4 h-4 text-rose-400" />
            <span>
              <strong>Wire Cutter Active:</strong> Click any wire on the table to snip and remove it!
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
          ) : (
            <CircuitWorkbench
              controlsState={circuitControls}
              onSelectComponent={setSelectedComponent}
              selectedComponentId={selectedComponent?.id ?? null}
              onUpdateTelemetry={data => setCircuitTelemetry(data)}
              onOscilloscopeSample={handleCircuitScopeSample}
            />
          )}
        </div>

        {/* ========================================================================= */}
        {/* 4. LEFT CONTROL PANEL                                                    */}
        {/* ========================================================================= */}
        <div className="absolute top-4 left-4 z-10 w-80 max-h-[calc(100vh-8.5rem)] overflow-y-auto bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-col space-y-3.5 transition-all duration-300 shadow-2xl">
          {activeMode === 'field' ? (
            /* Field Sandbox Controls */
            <>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Configurations
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">k = 8.99×10⁹ N·m²/C²</span>
                </div>
                <select
                  onChange={e => {
                    (window as any).__fieldSandbox?.loadPreset(e.target.value);
                    showToast(`Loaded ${e.target.selectedOptions[0].text}`);
                  }}
                  defaultValue="dipole"
                  className="w-full mt-1.5 bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                >
                  <option value="dipole">Preset: Electric Dipole (+q / -q)</option>
                  <option value="quadrupole">Preset: Quadrupole Square</option>
                  <option value="capacitor">Preset: Parallel Plate Capacitor</option>
                  <option value="grounded_plane">Preset: Point near Grounded Plane</option>
                  <option value="repulsion">Preset: Like Charges (Repulsion)</option>
                </select>
              </div>

              {/* Charge Palette & Source Magnitude Controls */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase text-slate-300">
                    Source Charges
                  </span>
                  <span className="text-[9px] text-cyan-400 font-mono">MAGNITUDE &amp; DROP</span>
                </div>

                {/* Default Source Charge Magnitude Control */}
                <div className="space-y-1.5 bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Deploy Magnitude:</span>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        min="0.1"
                        max="30"
                        step="0.5"
                        value={sourceDefaultQ}
                        onChange={e => setSourceDefaultQ(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                        className="w-16 px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-right font-mono font-bold text-cyan-300 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
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
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  {/* Quick Preset Buttons for Source Charges */}
                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    {[1, 2.5, 5, 10, 15].map(q => (
                      <button
                        key={q}
                        onClick={() => setSourceDefaultQ(q)}
                        className={`flex-1 py-0.5 text-[10px] rounded font-mono transition ${
                          sourceDefaultQ === q
                            ? 'bg-cyan-600 text-white font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {q}μC
                      </button>
                    ))}
                  </div>
                </div>

                {/* Drop Buttons using configured Source Magnitude */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <button
                    onClick={() => {
                      setFieldPlacementMode(prev => (prev === 'charge_pos' ? 'none' : 'charge_pos'));
                      showToast(`Click Cartesian grid to place +${sourceDefaultQ.toFixed(1)} μC charge`);
                    }}
                    className={`py-1.5 px-2 border rounded-lg flex items-center justify-center space-x-1.5 transition font-semibold ${
                      fieldPlacementMode === 'charge_pos'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30'
                        : 'bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/60 text-rose-300'
                    }`}
                  >
                    <span className="text-base leading-none font-bold text-rose-400">+</span>
                    <span>Drop (+{sourceDefaultQ.toFixed(1)} μC)</span>
                  </button>
                  <button
                    onClick={() => {
                      setFieldPlacementMode(prev => (prev === 'charge_neg' ? 'none' : 'charge_neg'));
                      showToast(`Click Cartesian grid to place -${sourceDefaultQ.toFixed(1)} μC charge`);
                    }}
                    className={`py-1.5 px-2 border rounded-lg flex items-center justify-center space-x-1.5 transition font-semibold ${
                      fieldPlacementMode === 'charge_neg'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                        : 'bg-blue-950/40 hover:bg-blue-900/60 border-blue-800/60 text-blue-300'
                    }`}
                  >
                    <span className="text-base leading-none font-bold text-sky-400">-</span>
                    <span>Drop (-{sourceDefaultQ.toFixed(1)} μC)</span>
                  </button>
                </div>
                <button
                  onClick={() => {
                    (window as any).__fieldSandbox?.clearCharges();
                    showToast('All source charges cleared');
                  }}
                  className="w-full py-1 px-2 text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/50 rounded-lg border border-rose-900/40 transition text-xs"
                >
                  Clear All Charges
                </button>
              </div>

              {/* Cursor Drop Test Particle & Magnitude Controls */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold uppercase tracking-wider text-slate-300 text-[11px]">
                    Test Charge Launcher
                  </span>
                  <span className="text-[9px] text-emerald-400 font-mono">STABLE RK4 INTEGRATOR</span>
                </div>

                {/* PROMINENT CURSOR DROP TEST CHARGE BUTTON */}
                <button
                  onClick={() => {
                    setFieldPlacementMode(prev => (prev === 'tracer' ? 'none' : 'tracer'));
                    showToast(
                      fieldPlacementMode === 'tracer'
                        ? 'Exited cursor drop mode'
                        : 'Cursor Drop Active: Click anywhere on Cartesian grid or double-click to drop test particle'
                    );
                  }}
                  className={`w-full py-2 px-3 rounded-xl border flex items-center justify-center space-x-2 transition font-bold ${
                    fieldPlacementMode === 'tracer'
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-600/30'
                      : 'bg-emerald-950/50 hover:bg-emerald-900/70 text-emerald-300 border-emerald-800/60'
                  }`}
                >
                  <Target className="w-4 h-4" />
                  <span>
                    {fieldPlacementMode === 'tracer'
                      ? 'Cancel Cursor Placement'
                      : `Drop Test Charge (${tracerSettings.qMicro >= 0 ? '+' : ''}${tracerSettings.qMicro.toFixed(1)} μC)`}
                  </span>
                </button>

                {/* Test Charge Polarity & Magnitude Controls */}
                <div className="space-y-1.5 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80">
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
                        className="w-16 px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-right font-mono font-bold text-emerald-300 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                      <span className="text-slate-400 font-mono text-[11px]">μC</span>
                    </div>
                  </div>

                  {/* Test Charge Slider */}
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

                  {/* Polarity & Quick Presets */}
                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    {[-1.0, -0.5, 0.2, 0.5, 1.0, 2.0].map(val => (
                      <button
                        key={val}
                        onClick={() => setTracerSettings(prev => ({ ...prev, qMicro: val }))}
                        className={`flex-1 py-0.5 text-[10px] rounded font-mono transition ${
                          tracerSettings.qMicro === val
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {val > 0 ? `+${val}` : val}
                      </button>
                    ))}
                  </div>

                  {/* Test Particle Mass (mg) */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400">Particle Mass (m):</span>
                    <div className="flex items-center space-x-1">
                      <span className="font-mono text-cyan-300 font-bold">{tracerSettings.massMicro}</span>
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
                    className="w-full accent-cyan-400 cursor-pointer"
                  />

                  {/* Simulation Physics Behavior Controls */}
                  <div className="pt-1 border-t border-slate-800/80 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Simulation Speed:</span>
                      <span className="font-mono text-cyan-400">{tracerSettings.simSpeed.toFixed(1)}x</span>
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
                      className="w-full accent-cyan-400 cursor-pointer"
                    />

                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-slate-400">Viscous Damping / Drag:</span>
                      <span className="font-mono text-cyan-400">
                        {tracerSettings.damping === 0
                          ? 'Vacuum (Ballistic)'
                          : tracerSettings.damping > 0.3
                          ? 'High (Field-Line Follower)'
                          : 'Medium'}
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
                      className="w-full accent-cyan-400 cursor-pointer"
                    />

                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-slate-300 font-medium">2D Cartesian Plane Lock:</span>
                      <input
                        type="checkbox"
                        checked={tracerSettings.lockToPlane}
                        onChange={e =>
                          setTracerSettings(prev => ({
                            ...prev,
                            lockToPlane: e.target.checked,
                          }))
                        }
                        className="w-3.5 h-3.5 rounded text-emerald-500 bg-slate-800 border-slate-700"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      (window as any).__fieldSandbox?.fireTracer();
                      showToast('Test particle fired on Cartesian grid');
                    }}
                    className="py-1.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold transition active:scale-95 flex items-center justify-center space-x-1"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Launch v₀</span>
                  </button>
                  <button
                    onClick={() => {
                      (window as any).__fieldSandbox?.clearTracers();
                      showToast('Cleared all particle trails');
                    }}
                    className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 transition"
                  >
                    Clear Trails
                  </button>
                </div>
              </div>

              {/* Selected Charge Inspector (Direct Magnitude Control & Sliders) */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-semibold uppercase text-slate-300">
                    {selectedCharge
                      ? `Charge (${selectedCharge.qMicro >= 0 ? '+' : ''}${selectedCharge.qMicro.toFixed(1)} μC)`
                      : 'Inspector: No Charge Selected'}
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
                        className="w-16 px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-right font-mono font-bold text-cyan-300 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
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
                    className="w-full accent-cyan-400 cursor-pointer"
                  />

                  {/* Quick Nudge Buttons for Selected Charge */}
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
                        className="flex-1 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono"
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
                        showToast(`Flipped charge polarity to ${val >= 0 ? '+' : ''}${val.toFixed(1)} μC`);
                      }}
                      className="px-2 py-0.5 text-[10px] bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded font-bold"
                      title="Flip Sign (+ / -)"
                    >
                      ± Sign
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400">Cartesian (X, Z):</span>
                    <span className="font-mono text-cyan-300 text-[11px]">
                      {selectedCharge
                        ? `(${selectedCharge.x.toFixed(1)}, ${selectedCharge.z.toFixed(1)})`
                        : '(0.0, 0.0)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Field Visualizations */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                <span className="font-semibold uppercase tracking-wider text-slate-400 text-[11px]">
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
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-800 border-slate-700"
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
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-800 border-slate-700"
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
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-800 border-slate-700"
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
                    className="w-4 h-4 rounded text-cyan-500 bg-slate-800 border-slate-700"
                  />
                </div>
              </div>
            </>
          ) : (
            /* Circuit Workbench Controls (Issue 4, 5, 8) */
            <>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
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
                  className="w-full mt-1.5 bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="parallel">Preset: Parallel Twin Branch</option>
                  <option value="series">Preset: Series (Resistor + Lamp + Voltmeter)</option>
                  <option value="rc">Preset: RC Transient Filter Circuit</option>
                  <option value="wheatstone">Preset: Wheatstone Bridge Network</option>
                  <option value="blank">✨ Blank Breadboard (Build from Scratch)</option>
                </select>
              </div>

              {/* TOOL SELECTOR & BREADBOARD MANIPULATION (Issue 4) */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase text-slate-300">
                    Interactive Workbench Tools
                  </span>
                  <span className="text-[9px] text-cyan-400 font-mono">MODES</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => {
                      setCircuitControls(prev => ({ ...prev, activeTool: 'select' }));
                      showToast('Select / Drag mode active: Move components on breadboard');
                    }}
                    className={`py-1.5 px-1 rounded-lg text-center font-semibold transition flex flex-col items-center gap-1 ${
                      circuitControls.activeTool === 'select'
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <MousePointer className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Select / Move</span>
                  </button>
                  <button
                    onClick={() => {
                      setCircuitControls(prev => ({ ...prev, activeTool: 'wire' }));
                      showToast('Wire Tool active: Click terminal 1, then terminal 2 to connect');
                    }}
                    className={`py-1.5 px-1 rounded-lg text-center font-semibold transition flex flex-col items-center gap-1 ${
                      circuitControls.activeTool === 'wire'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
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
                    className={`py-1.5 px-1 rounded-lg text-center font-semibold transition flex flex-col items-center gap-1 ${
                      circuitControls.activeTool === 'cut'
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Cut Wire</span>
                  </button>
                </div>

                {/* TEXTBOOK WIRE ARRANGEMENT & GRID SNAPPING (Issue 8) */}
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Wire Routing:</span>
                    <button
                      onClick={() => {
                        const nextStyle = circuitControls.wireRouting === 'orthogonal' ? 'curved' : 'orthogonal';
                        setCircuitControls(prev => ({ ...prev, wireRouting: nextStyle }));
                        showToast(`Wire routing: ${nextStyle === 'orthogonal' ? 'Textbook 90° Manhattan' : 'Curved Cable'}`);
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700"
                    >
                      {circuitControls.wireRouting === 'orthogonal' ? 'Textbook 90°' : 'Curved Cable'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      onClick={() => {
                        (window as any).__circuitWorkbench?.alignToGrid();
                        showToast('Components snapped to textbook grid');
                      }}
                      className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] flex items-center justify-center gap-1"
                    >
                      <Grid className="w-3 h-3" />
                      <span>Snap to Grid</span>
                    </button>
                    <button
                      onClick={() => {
                        (window as any).__circuitWorkbench?.clearAll();
                        showToast('Breadboard cleared. Add components to build your own circuit!');
                      }}
                      className="py-1 px-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-[10px] flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear Board</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* COMPONENT PALETTE WITH VOLTMETER AND AMMETER (Issue 4, 5) */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase text-slate-300">
                    Component Palette
                  </span>
                  <span className="text-[9px] text-cyan-400 font-mono">CLICK TO ADD</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <button
                    onClick={() => {
                      (window as any).__circuitWorkbench?.addComponent('battery');
                      showToast('Added DC Battery (EMF Source)');
                    }}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
                  >
                    + Battery (DC)
                  </button>
                  <button
                    onClick={() => {
                      (window as any).__circuitWorkbench?.addComponent('bulb');
                      showToast('Added Incandescent Light Bulb');
                    }}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
                  >
                    + Light Bulb
                  </button>
                  <button
                    onClick={() => {
                      (window as any).__circuitWorkbench?.addComponent('resistor');
                      showToast('Added Resistor (R)');
                    }}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
                  >
                    + Resistor
                  </button>
                  <button
                    onClick={() => {
                      (window as any).__circuitWorkbench?.addComponent('switch');
                      showToast('Added SPST Knife Switch');
                    }}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
                  >
                    + Knife Switch
                  </button>
                  <button
                    onClick={() => {
                      (window as any).__circuitWorkbench?.addComponent('capacitor');
                      showToast('Added Capacitor (C)');
                    }}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
                  >
                    + Capacitor
                  </button>
                  <button
                    onClick={() => {
                      (window as any).__circuitWorkbench?.addComponent('inductor');
                      showToast('Added Inductor Coil (L)');
                    }}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
                  >
                    + Inductor
                  </button>

                  {/* FUNCTIONAL METERS (Issue 5) */}
                  <button
                    onClick={() => {
                      (window as any).__circuitWorkbench?.addComponent('voltmeter');
                      showToast('Added Digital Voltmeter (10MΩ input impedance)');
                    }}
                    className="py-1.5 px-2 bg-emerald-950/50 hover:bg-emerald-900/70 text-emerald-300 font-semibold rounded-lg border border-emerald-800/60 transition"
                  >
                    + Voltmeter (V)
                  </button>
                  <button
                    onClick={() => {
                      (window as any).__circuitWorkbench?.addComponent('ammeter');
                      showToast('Added Digital Ammeter (0.001Ω shunt resistance)');
                    }}
                    className="py-1.5 px-2 bg-sky-950/50 hover:bg-sky-900/70 text-sky-300 font-semibold rounded-lg border border-sky-800/60 transition"
                  >
                    + Ammeter (A)
                  </button>
                </div>
              </div>

              {/* Selected Component Inspector Card */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="font-semibold uppercase text-slate-300">
                    {selectedComponent
                      ? `Selected: ${selectedComponent.type.toUpperCase()}`
                      : 'Inspector: No Component Selected'}
                  </span>
                  {selectedComponent && (
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => {
                          (window as any).__circuitWorkbench?.rotateSelectedComponent(selectedComponent.id);
                          showToast('Rotated component 90°');
                        }}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5"
                        title="Rotate 90 degrees"
                      >
                        <RotateCw className="w-3 h-3" />
                        <span>Rotate</span>
                      </button>
                      <button
                        onClick={() => {
                          (window as any).__circuitWorkbench?.deleteSelectedComponent(selectedComponent.id);
                          showToast('Component and attached wires removed');
                        }}
                        className="text-[10px] text-rose-400 hover:text-rose-300 underline ml-1"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <div
                  className={`space-y-2 transition-opacity ${
                    selectedComponent ? 'opacity-100' : 'opacity-40 pointer-events-none'
                  }`}
                >
                  {/* Live Meter Readouts */}
                  {selectedComponent?.type === 'voltmeter' && (
                    <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/50 space-y-1">
                      <div className="text-[10px] text-emerald-400 font-mono font-bold uppercase">
                        Digital Voltmeter Readout
                      </div>
                      <div className="text-base font-mono font-bold text-white">
                        {selectedComponent.measuredValue !== undefined
                          ? `${selectedComponent.measuredValue >= 0 ? '+' : ''}${selectedComponent.measuredValue.toFixed(3)} V`
                          : '0.000 V'}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        Measures ΔV = V(pos) - V(neg). Connect terminals across any circuit element.
                      </div>
                    </div>
                  )}

                  {selectedComponent?.type === 'ammeter' && (
                    <div className="p-2 rounded-lg bg-sky-950/30 border border-sky-800/50 space-y-1">
                      <div className="text-[10px] text-sky-400 font-mono font-bold uppercase">
                        Digital Ammeter Readout
                      </div>
                      <div className="text-base font-mono font-bold text-white">
                        {selectedComponent.measuredValue !== undefined
                          ? `${selectedComponent.measuredValue >= 0 ? '+' : ''}${selectedComponent.measuredValue.toFixed(3)} A`
                          : '0.000 A'}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        Measures series current through branch. Connect in series with circuit loop.
                      </div>
                    </div>
                  )}

                  {selectedComponent?.type === 'switch' && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Knife Switch State:</span>
                        <span className={`font-mono font-bold ${selectedComponent.closed ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {selectedComponent.closed ? 'CLOSED (ON)' : 'OPEN (OFF)'}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const updated = { ...selectedComponent, closed: !selectedComponent.closed };
                          setSelectedComponent(updated);
                          (window as any).__circuitWorkbench?.updateSelectedComponent(updated);
                          showToast(`Switch turned ${updated.closed ? 'ON (Closed)' : 'OFF (Open)'}`);
                        }}
                        className={`w-full py-1.5 rounded-lg font-bold text-xs transition ${
                          selectedComponent.closed
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-amber-600 hover:bg-amber-500 text-white'
                        }`}
                      >
                        {selectedComponent.closed ? 'Open Knife Switch' : 'Close Knife Switch'}
                      </button>
                    </div>
                  )}

                  {selectedComponent?.type === 'battery' && (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">EMF Voltage (V):</span>
                        <span className="font-mono text-cyan-400 font-bold">
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
                        className="w-full accent-cyan-400"
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
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  )}

                  {selectedComponent?.type === 'capacitor' && (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Capacitance (μF):</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          {selectedComponent.value.toFixed(0)} μF
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="2000"
                        step="10"
                        value={selectedComponent.value}
                        onChange={e => {
                          const val = parseFloat(e.target.value);
                          const updated = { ...selectedComponent, value: val };
                          setSelectedComponent(updated);
                          (window as any).__circuitWorkbench?.updateSelectedComponent(updated);
                        }}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 5. RIGHT TELEMETRY HUD                                                    */}
        {/* ========================================================================= */}
        <div className="absolute top-4 right-4 z-10 bg-slate-900/85 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-4 w-72 flex flex-col space-y-2.5 text-xs shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Live Telemetry
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
              {activeMode === 'field' ? 'Field Physics' : 'MNA Engine'}
            </span>
          </div>

          {activeMode === 'field' ? (
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>Source Charges:</span>
                <span className="text-slate-200 font-bold">{fieldTelemetry.chargeCount}</span>
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
                <span>Active Tracers:</span>
                <span className="text-cyan-400 font-bold">{fieldTelemetry.activeParticles}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>Source EMF (ε):</span>
                <span className="text-cyan-400 font-bold">
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
                <span
                  className={`font-bold ${
                    circuitTelemetry.kclMaxResidual < 0.1 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {circuitTelemetry.kclMaxResidual.toFixed(4)} A
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>KVL Status:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Balanced</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 6. BOTTOM OSCILLOSCOPE DOCK (Issue 7 Clean Layout)                         */}
        {/* ========================================================================= */}
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
      </main>

      {/* Guided Lab Report Card Modal */}
      <GuidedLabModal
        isOpen={isGuidedLabOpen}
        onClose={() => setIsGuidedLabOpen(false)}
        assignment={assignment}
        currentUser={currentUser}
        initialSubmission={currentSubmission}
        onSaveDraft={handleSaveDraft}
        onSubmitLab={handleSubmitLab}
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

      {/* Instructor Dashboard & Review View */}
      <InstructorDashboardModal
        isOpen={isTeacherDashboardOpen}
        onClose={() => setIsTeacherDashboardOpen(false)}
        submissions={teacherSubmissions}
        currentUser={currentUser}
        onGradeSubmission={handleGradeSubmission}
        onRestoreSceneSnapshot={handleRestoreStudentSnapshot}
        onExportCSV={() => {
          labStorage.exportSubmissionsCSV();
          showToast('Downloaded student grades and submissions as CSV spreadsheet');
        }}
      />

      {/* Login & Sign-Up Auth Modal (Issue 9) */}
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
      <CalculusTheoryModal isOpen={isTheoryOpen} onClose={() => setIsTheoryOpen(false)} />
    </div>
  );
}
