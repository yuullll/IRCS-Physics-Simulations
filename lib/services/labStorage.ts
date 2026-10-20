'use client';

import {
  UserProfile,
  LabAssignment,
  LabSubmission,
  SavedExperiment,
  SceneSnapshot,
  LabDataRow,
} from '@/lib/types/lab';

export const MOCK_USERS: UserProfile[] = [
  {
    id: 'user_teacher_1',
    name: 'Dr. Robert Vance',
    email: 'rvance@physics.edu',
    role: 'instructor',
    avatar: '👨‍🏫',
    classId: 'ap_phys_p3',
    className: 'AP Physics C: E&M (Period 3)',
  },
  {
    id: 'user_student_1',
    name: 'Alex Chen',
    email: 'achen@student.edu',
    role: 'student',
    avatar: '🧑‍🎓',
    classId: 'ap_phys_p3',
    className: 'AP Physics C: E&M (Period 3)',
  },
  {
    id: 'user_student_2',
    name: 'Maya Patel',
    email: 'mpatel@student.edu',
    role: 'student',
    avatar: '👩‍🎓',
    classId: 'ap_phys_p3',
    className: 'AP Physics C: E&M (Period 3)',
  },
  {
    id: 'user_student_3',
    name: 'Liam Wang',
    email: 'lwang@student.edu',
    role: 'student',
    avatar: '👨‍🎓',
    classId: 'ap_phys_p3',
    className: 'AP Physics C: E&M (Period 3)',
  },
];

export const DEFAULT_LAB_ASSIGNMENT: LabAssignment = {
  id: 'lab_coulomb_01',
  title: 'Lab 01: Coulomb\'s Inverse Square Law',
  subtitle: 'Fixed Charge Magnitude, Varying Distance Verification',
  topic: 'Electrostatics & Field Calculus',
  objectives: [
    'Measure the electrostatic Coulomb force between two charges at varying separation distances.',
    'Verify that electrostatic force obeys an inverse-square relationship: F ∝ 1/r².',
    'Compare numerical simulated forces with the analytical Coulomb equation F = k·|q₁·q₂|/r².',
    'Calculate percent error and explain sources of divergence in finite numerical integration.',
  ],
  fixedParameters: {
    q1Micro: 5.0,
    q2Micro: -5.0,
    kConstant: 8.98755e9,
  },
  rubric: {
    hypothesisMax: 20,
    dataAccuracyMax: 40,
    analysisMax: 25,
    explanationMax: 15,
    totalMax: 100,
  },
};

const STORAGE_KEYS = {
  CURRENT_USER: 'app_ap_physics_current_user_id',
  USERS: 'app_ap_physics_registered_users',
  SAVED_SCENES: 'app_ap_physics_saved_scenes',
  AUTO_SAVES: 'app_ap_physics_auto_saves',
  SUBMISSIONS: 'app_ap_physics_lab_submissions',
  HIDDEN_DEVICE_ACCOUNTS: 'app_ap_physics_hidden_device_accounts',
};

// Seed initial student sample submissions for teacher evaluation
function getInitialSubmissions(): LabSubmission[] {
  const mayaSnapshot: SceneSnapshot = {
    id: 'snap_maya_01',
    version: '1.0',
    timestamp: '2026-10-11T14:32:00Z',
    title: 'Maya\'s Coulomb Dipole Investigation',
    mode: 'field',
    fieldData: {
      charges: [
        { id: 'q_pos_maya', q: 5e-6, qMicro: 5.0, x: -3.0, y: 0.65, z: 0 },
        { id: 'q_neg_maya', q: -5e-6, qMicro: -5.0, x: 3.0, y: 0.65, z: 0 },
      ],
      controlsState: {
        showVectors: true,
        showForces: true,
        showStreamlines: true,
        showSlicePlane: true,
        sliceOrientation: 'xz',
        sliceOffset: 0.65,
        gridDensity: 18,
        bField: { x: 0, y: 0, z: 0, enabled: false },
        viewMode: '3d',
      },
      tracerSettings: { qMicro: 1.0, massMicro: 40, vx: 0, vz: 0 },
    },
    camera: { x: 0, y: 18, z: 22, targetX: 0, targetY: 0, targetZ: 0 },
  };

  const mayaTable: LabDataRow[] = [
    { trial: 1, distanceR: 2.0, rSquared: 4.0, measuredForce: 56.17, calculatedForce: 56.17, percentError: 0.0 },
    { trial: 2, distanceR: 4.0, rSquared: 16.0, measuredForce: 14.04, calculatedForce: 14.04, percentError: 0.0 },
    { trial: 3, distanceR: 6.0, rSquared: 36.0, measuredForce: 6.24, calculatedForce: 6.24, percentError: 0.0 },
    { trial: 4, distanceR: 8.0, rSquared: 64.0, measuredForce: 3.51, calculatedForce: 3.51, percentError: 0.0 },
    { trial: 5, distanceR: 10.0, rSquared: 100.0, measuredForce: 2.25, calculatedForce: 2.25, percentError: 0.0 },
  ];

  const liamSnapshot: SceneSnapshot = {
    id: 'snap_liam_01',
    version: '1.0',
    timestamp: '2026-10-11T16:45:00Z',
    title: 'Liam\'s Quadrupole Array Test',
    mode: 'field',
    fieldData: {
      charges: [
        { id: 'q1', q: 5e-6, qMicro: 5.0, x: -4.0, y: 0.65, z: -4.0 },
        { id: 'q2', q: -5e-6, qMicro: -5.0, x: 4.0, y: 0.65, z: -4.0 },
        { id: 'q3', q: -5e-6, qMicro: -5.0, x: -4.0, y: 0.65, z: 4.0 },
        { id: 'q4', q: 5e-6, qMicro: 5.0, x: 4.0, y: 0.65, z: 4.0 },
      ],
      controlsState: {
        showVectors: true,
        showForces: true,
        showStreamlines: true,
        showSlicePlane: false,
        sliceOrientation: 'xz',
        sliceOffset: 0.65,
        gridDensity: 16,
        bField: { x: 0, y: 0, z: 0, enabled: false },
        viewMode: '3d',
      },
      tracerSettings: { qMicro: 1.0, massMicro: 40, vx: 0, vz: 0 },
    },
    camera: { x: 0, y: 22, z: 26, targetX: 0, targetY: 0, targetZ: 0 },
  };

  const liamTable: LabDataRow[] = [
    { trial: 1, distanceR: 2.5, rSquared: 6.25, measuredForce: 35.95, calculatedForce: 35.95, percentError: 0.0 },
    { trial: 2, distanceR: 5.0, rSquared: 25.0, measuredForce: 8.99, calculatedForce: 8.99, percentError: 0.0 },
    { trial: 3, distanceR: 7.5, rSquared: 56.25, measuredForce: 3.99, calculatedForce: 3.99, percentError: 0.0 },
  ];

  return [
    {
      id: 'sub_maya_01',
      assignmentId: DEFAULT_LAB_ASSIGNMENT.id,
      assignmentTitle: DEFAULT_LAB_ASSIGNMENT.title,
      studentId: 'user_student_2',
      studentName: 'Maya Patel',
      studentEmail: 'mpatel@student.edu',
      classId: 'ap_phys_p3',
      className: 'AP Physics C: E&M (Period 3)',
      status: 'submitted',
      submittedAt: '2026-10-11T14:35:00Z',
      updatedAt: '2026-10-11T14:35:00Z',
      hypothesis: 'If the distance r between charges q₁ = +5μC and q₂ = -5μC doubles, then the attractive electrostatic force will decrease by a factor of 4, consistent with Coulomb\'s inverse-square law.',
      dataTable: mayaTable,
      analysisExplanation: 'Plotting F vs 1/r² yields an exact linear slope equal to k·|q₁·q₂| = 8.98755×10⁹ × 25×10⁻¹² = 0.2247 N·m². The simulated vector field and force indicators matched analytical theory with 0.00% error.',
      conclusion: 'Coulomb\'s Law was verified over distances 2m to 10m. The equipotential slice plane confirmed orthogonal field line orientation at all boundary points.',
      sceneSnapshot: mayaSnapshot,
    },
    {
      id: 'sub_liam_01',
      assignmentId: DEFAULT_LAB_ASSIGNMENT.id,
      assignmentTitle: DEFAULT_LAB_ASSIGNMENT.title,
      studentId: 'user_student_3',
      studentName: 'Liam Wang',
      studentEmail: 'lwang@student.edu',
      classId: 'ap_phys_p3',
      className: 'AP Physics C: E&M (Period 3)',
      status: 'graded',
      submittedAt: '2026-10-11T16:50:00Z',
      updatedAt: '2026-10-11T17:10:00Z',
      hypothesis: 'The force magnitude between two opposite charges will fall off strictly as 1/r², while multi-charge quadrupole arrangements will decay faster (as 1/r³ or 1/r⁴ at large distances).',
      dataTable: liamTable,
      analysisExplanation: 'At 2.5m, F was measured at 35.95 N. At 5.0m, the force dropped to 8.99 N (exactly one quarter).',
      conclusion: 'The data strongly supports the AP Physics C electrostatics inverse-square principle.',
      sceneSnapshot: liamSnapshot,
      grade: 98,
      feedback: 'Excellent investigation Liam. Your insight regarding the higher-order multipole decay rate demonstrates deep calculus-based conceptual mastery. Full marks on data verification.',
      gradedAt: '2026-10-11T17:10:00Z',
      gradedBy: 'Dr. Robert Vance',
    },
  ];
}

class LabStorageService {
  private memorySubmissions: LabSubmission[] = [];
  private memorySavedScenes: SavedExperiment[] = [];
  private memoryAutoSaves: Record<string, SceneSnapshot> = {};
  private memoryUsers: UserProfile[] = [...MOCK_USERS];
  private currentUserId: string = 'user_student_1'; // Alex Chen default
  private hiddenAccountIds: Set<string> = new Set();
  private cachedVisibleUsers: UserProfile[] = [];
  private cachedHiddenUsers: UserProfile[] = [];
  private listeners: Set<() => void> = new Set();

  private updateUserCaches(): void {
    const visible = this.memoryUsers.filter(u => !this.hiddenAccountIds.has(u.id));
    this.cachedVisibleUsers = visible.length > 0 ? visible : this.memoryUsers.slice(0, 1);
    this.cachedHiddenUsers = this.memoryUsers.filter(u => this.hiddenAccountIds.has(u.id));
  }

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
        if (storedUsers) {
          try {
            const parsed = JSON.parse(storedUsers);
            if (Array.isArray(parsed) && parsed.length > 0) {
              this.memoryUsers = parsed;
            }
          } catch (e) {
            console.warn('Failed parsing registered users:', e);
          }
        } else {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(this.memoryUsers));
        }

        const storedUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        if (storedUserId && this.memoryUsers.some(u => u.id === storedUserId)) {
          this.currentUserId = storedUserId;
        }

        const storedHidden = localStorage.getItem(STORAGE_KEYS.HIDDEN_DEVICE_ACCOUNTS);
        if (storedHidden) {
          try {
            const arr = JSON.parse(storedHidden);
            if (Array.isArray(arr)) {
              this.hiddenAccountIds = new Set(arr);
            }
          } catch (e) {}
        }

        const storedSubs = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
        if (storedSubs) {
          this.memorySubmissions = JSON.parse(storedSubs);
        } else {
          this.memorySubmissions = getInitialSubmissions();
          localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(this.memorySubmissions));
        }

        const storedScenes = localStorage.getItem(STORAGE_KEYS.SAVED_SCENES);
        if (storedScenes) {
          this.memorySavedScenes = JSON.parse(storedScenes);
        }

        const storedAuto = localStorage.getItem(STORAGE_KEYS.AUTO_SAVES);
        if (storedAuto) {
          this.memoryAutoSaves = JSON.parse(storedAuto);
        }
      } catch (err) {
        console.warn('Storage initialization fallback to memory:', err);
        this.memorySubmissions = getInitialSubmissions();
      }
    } else {
      this.memorySubmissions = getInitialSubmissions();
    }
    this.updateUserCaches();
  }

  // Auth & Profile
  public getCurrentUser(): UserProfile {
    const user = this.memoryUsers.find(u => u.id === this.currentUserId);
    return user || this.memoryUsers[0] || MOCK_USERS[1];
  }

  public setCurrentUser(userId: string): UserProfile {
    const found = this.memoryUsers.find(u => u.id === userId);
    if (found) {
      this.currentUserId = found.id;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, found.id);
      }
      this.notify();
      return found;
    }
    return this.getCurrentUser();
  }

  public getAllUsers(): UserProfile[] {
    return this.memoryUsers;
  }

  // Get only accounts that are allowed to show on this device/laptop (cached reference)
  public getVisibleUsersOnDevice(): UserProfile[] {
    return this.cachedVisibleUsers;
  }

  // Hide/Forget an account from this laptop screen WITHOUT deleting it from database
  public forgetAccountOnDevice(userId: string): void {
    this.hiddenAccountIds.add(userId);
    this.persistHiddenAccounts();
    this.updateUserCaches();

    // If active user was forgotten from this device, switch to first visible account
    if (this.currentUserId === userId) {
      const fallback = this.cachedVisibleUsers[0] || MOCK_USERS[1];
      this.currentUserId = fallback.id;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, fallback.id);
        } catch (e) {}
      }
    }
    this.notify();
  }

  // Restore/unhide an account on this laptop
  public restoreAccountOnDevice(userId: string): void {
    this.hiddenAccountIds.delete(userId);
    this.persistHiddenAccounts();
    this.updateUserCaches();
    this.notify();
  }

  // Restore all hidden accounts on this laptop
  public restoreAllAccountsOnDevice(): void {
    this.hiddenAccountIds.clear();
    this.persistHiddenAccounts();
    this.updateUserCaches();
    this.notify();
  }

  public getHiddenAccountsOnDevice(): UserProfile[] {
    return this.cachedHiddenUsers;
  }

  private persistHiddenAccounts(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          STORAGE_KEYS.HIDDEN_DEVICE_ACCOUNTS,
          JSON.stringify(Array.from(this.hiddenAccountIds))
        );
      } catch (e) {}
    }
  }

  // Student Account Choices: Permanently delete account and all data
  public deleteStudentAccount(studentId: string): void {
    this.memoryUsers = this.memoryUsers.filter(u => u.id !== studentId);
    this.memorySubmissions = this.memorySubmissions.filter(s => s.studentId !== studentId);
    this.memorySavedScenes = this.memorySavedScenes.filter(e => e.userId !== studentId);
    this.hiddenAccountIds.delete(studentId);

    if (this.currentUserId === studentId) {
      const remaining = this.getVisibleUsersOnDevice();
      const fallback = remaining[0] || MOCK_USERS[1];
      this.currentUserId = fallback.id;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, fallback.id);
        } catch (e) {}
      }
    }

    this.persistUsers();
    this.persistSubmissions();
    this.persistSavedScenes();
    this.persistHiddenAccounts();
    this.notify();
  }

  // Student Account Choices: Reset personal lab progress
  public resetStudentProgress(studentId: string): void {
    this.memorySubmissions = this.memorySubmissions.filter(s => s.studentId !== studentId);
    this.persistSubmissions();
    this.notify();
  }

  public registerUser(data: {
    name: string;
    email: string;
    password?: string;
    role: 'student' | 'instructor';
    className?: string;
    avatar?: string;
  }): UserProfile {
    const defaultAvatar = data.role === 'instructor' ? '👨‍🏫' : '🧑‍🎓';
    const newUser: UserProfile = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password || '',
      role: data.role,
      avatar: data.avatar || defaultAvatar,
      classId: 'ap_phys_p3',
      className: data.className?.trim() || 'AP Physics C: E&M (Period 3)',
    };

    // Check if email already registered
    const existingIndex = this.memoryUsers.findIndex(
      u => u.email.toLowerCase() === newUser.email.toLowerCase()
    );
    if (existingIndex >= 0) {
      this.memoryUsers[existingIndex] = newUser;
    } else {
      this.memoryUsers.unshift(newUser);
    }

    this.currentUserId = newUser.id;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, newUser.id);
      } catch (e) {}
    }

    this.persistUsers();
    return newUser;
  }

  public loginUser(email: string, password?: string): UserProfile | null {
    const normalized = email.trim().toLowerCase();
    const found = this.memoryUsers.find(u => u.email.toLowerCase() === normalized);
    if (!found) return null;

    // If user has password and one was provided, verify
    if (found.password && password && found.password !== password) {
      return null;
    }

    this.currentUserId = found.id;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, found.id);
      } catch (e) {}
    }
    this.notify();
    return found;
  }

  public logoutUser(): UserProfile {
    // Switch to first student default
    const fallback = this.memoryUsers.find(u => u.role === 'student') || MOCK_USERS[1];
    this.currentUserId = fallback.id;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, fallback.id);
      } catch (e) {}
    }
    this.notify();
    return fallback;
  }

  // Teacher Class Roster & Administrative Controls
  public getClassStudents(classId?: string): UserProfile[] {
    return this.memoryUsers.filter(
      u => u.role === 'student' && (!classId || u.classId === classId)
    );
  }

  public enrollStudentInClass(data: {
    name: string;
    email: string;
    className?: string;
    classId?: string;
  }): UserProfile {
    const newStudent: UserProfile = {
      id: `user_stu_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      role: 'student',
      avatar: '🧑‍🎓',
      classId: data.classId || 'ap_phys_p3',
      className: data.className?.trim() || 'AP Physics C: E&M (Period 3)',
    };

    const existingIdx = this.memoryUsers.findIndex(
      u => u.email.toLowerCase() === newStudent.email
    );
    if (existingIdx >= 0) {
      this.memoryUsers[existingIdx] = { ...this.memoryUsers[existingIdx], ...newStudent };
    } else {
      this.memoryUsers.push(newStudent);
    }

    this.persistUsers();
    return newStudent;
  }

  public removeStudentFromClass(studentId: string): void {
    this.memoryUsers = this.memoryUsers.filter(u => u.id !== studentId);
    this.memorySubmissions = this.memorySubmissions.filter(s => s.studentId !== studentId);
    this.memorySavedScenes = this.memorySavedScenes.filter(e => e.userId !== studentId);

    if (this.currentUserId === studentId) {
      const instructor = this.memoryUsers.find(u => u.role === 'instructor') || this.memoryUsers[0];
      if (instructor) {
        this.currentUserId = instructor.id;
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, instructor.id);
          } catch (e) {}
        }
      }
    }

    this.persistUsers();
    this.persistSubmissions();
    this.persistSavedScenes();
  }

  public updateStudentInfo(
    studentId: string,
    updates: { name?: string; email?: string; className?: string }
  ): UserProfile | null {
    const idx = this.memoryUsers.findIndex(u => u.id === studentId);
    if (idx === -1) return null;

    const updated = {
      ...this.memoryUsers[idx],
      ...(updates.name ? { name: updates.name.trim() } : {}),
      ...(updates.email ? { email: updates.email.trim().toLowerCase() } : {}),
      ...(updates.className ? { className: updates.className.trim() } : {}),
    };
    this.memoryUsers[idx] = updated;

    // Sync student name/email in submissions
    this.memorySubmissions = this.memorySubmissions.map(sub =>
      sub.studentId === studentId
        ? { ...sub, studentName: updated.name, studentEmail: updated.email, className: updated.className }
        : sub
    );

    this.persistUsers();
    this.persistSubmissions();
    return updated;
  }

  public resetStudentSubmission(studentId: string, assignmentId?: string): void {
    this.memorySubmissions = this.memorySubmissions.filter(
      s => !(s.studentId === studentId && (!assignmentId || s.assignmentId === assignmentId))
    );
    this.persistSubmissions();
  }

  private persistUsers(): void {
    this.updateUserCaches();
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(this.memoryUsers));
      } catch (e) {}
    }
    this.notify();
  }

  // Auto-Save across refreshes
  public saveAutoSave(
    userId: string,
    mode: 'field' | 'circuit' | 'projectile',
    snapshot: SceneSnapshot
  ): void {
    const key = `${userId}_${mode}`;
    this.memoryAutoSaves[key] = snapshot;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.AUTO_SAVES, JSON.stringify(this.memoryAutoSaves));
      } catch (e) {
        console.warn('Auto-save write error:', e);
      }
    }
  }

  public getAutoSave(
    userId: string,
    mode: 'field' | 'circuit' | 'projectile'
  ): SceneSnapshot | null {
    const key = `${userId}_${mode}`;
    if (this.memoryAutoSaves[key]) return this.memoryAutoSaves[key];
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.AUTO_SAVES);
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed[key] || null;
        }
      } catch (e) {}
    }
    return null;
  }

  // Saved Experiments & Custom Scenes
  public saveExperiment(
    userId: string,
    title: string,
    description: string,
    snapshot: SceneSnapshot
  ): SavedExperiment {
    const user = this.getCurrentUser();
    const experiment: SavedExperiment = {
      id: 'exp_' + Math.random().toString(36).substring(2, 9),
      userId,
      userName: user.name,
      title: title.trim() || 'Untitled Experiment',
      description: description.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      snapshot: { ...snapshot, title },
    };

    this.memorySavedScenes.unshift(experiment);
    this.persistSavedScenes();
    return experiment;
  }

  public getSavedExperiments(userId?: string): SavedExperiment[] {
    if (!userId) return [...this.memorySavedScenes];
    return this.memorySavedScenes.filter(s => s.userId === userId);
  }

  public deleteSavedExperiment(id: string): void {
    this.memorySavedScenes = this.memorySavedScenes.filter(s => s.id !== id);
    this.persistSavedScenes();
  }

  private persistSavedScenes(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.SAVED_SCENES, JSON.stringify(this.memorySavedScenes));
      } catch (e) {}
    }
    this.notify();
  }

  // Lab Submissions & Teacher Workflow
  public getAssignment(): LabAssignment {
    return DEFAULT_LAB_ASSIGNMENT;
  }

  public getSubmissionForStudent(
    assignmentId: string,
    studentId: string
  ): LabSubmission | null {
    return this.memorySubmissions.find(
      s => s.assignmentId === assignmentId && s.studentId === studentId
    ) || null;
  }

  public getAllSubmissionsForTeacher(classId?: string): LabSubmission[] {
    if (!classId) return [...this.memorySubmissions];
    return this.memorySubmissions.filter(s => s.classId === classId);
  }

  public saveSubmissionDraft(submission: Partial<LabSubmission> & { assignmentId: string }): LabSubmission {
    const user = this.getCurrentUser();
    const existingIndex = this.memorySubmissions.findIndex(
      s => s.assignmentId === submission.assignmentId && s.studentId === user.id
    );

    const now = new Date().toISOString();

    if (existingIndex !== -1) {
      const updated: LabSubmission = {
        ...this.memorySubmissions[existingIndex],
        ...submission,
        updatedAt: now,
      };
      this.memorySubmissions[existingIndex] = updated;
      this.persistSubmissions();
      return updated;
    } else {
      const created: LabSubmission = {
        id: 'sub_' + Math.random().toString(36).substring(2, 9),
        assignmentId: submission.assignmentId,
        assignmentTitle: DEFAULT_LAB_ASSIGNMENT.title,
        studentId: user.id,
        studentName: user.name,
        studentEmail: user.email,
        classId: user.classId,
        className: user.className,
        status: 'draft',
        updatedAt: now,
        hypothesis: submission.hypothesis || '',
        dataTable: submission.dataTable || [],
        analysisExplanation: submission.analysisExplanation || '',
        conclusion: submission.conclusion || '',
        sceneSnapshot: submission.sceneSnapshot!,
      };
      this.memorySubmissions.push(created);
      this.persistSubmissions();
      return created;
    }
  }

  public submitLabReport(submission: LabSubmission): LabSubmission {
    submission.status = 'submitted';
    submission.submittedAt = new Date().toISOString();
    submission.updatedAt = new Date().toISOString();

    const existingIndex = this.memorySubmissions.findIndex(s => s.id === submission.id);
    if (existingIndex !== -1) {
      this.memorySubmissions[existingIndex] = submission;
    } else {
      this.memorySubmissions.push(submission);
    }
    this.persistSubmissions();
    return submission;
  }

  public gradeSubmission(
    submissionId: string,
    grade: number,
    feedback: string,
    instructorName: string
  ): LabSubmission | null {
    const sub = this.memorySubmissions.find(s => s.id === submissionId);
    if (!sub) return null;

    sub.grade = grade;
    sub.feedback = feedback;
    sub.status = 'graded';
    sub.gradedAt = new Date().toISOString();
    sub.gradedBy = instructorName;
    sub.updatedAt = new Date().toISOString();

    this.persistSubmissions();
    return sub;
  }

  private persistSubmissions(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(this.memorySubmissions));
      } catch (e) {}
    }
    this.notify();
  }

  // Import / Export helpers
  public exportSceneJSON(snapshot: SceneSnapshot): void {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${snapshot.title.replace(/\s+/g, '_')}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  public exportSubmissionsCSV(): void {
    const headers = [
      'Submission ID',
      'Student Name',
      'Student Email',
      'Class Period',
      'Status',
      'Submitted At',
      'Grade (Score)',
      'Graded By',
      'Hypothesis Summary',
      'Trials Count',
      'Teacher Feedback',
    ];

    const rows = this.memorySubmissions.map(s => [
      `"${s.id}"`,
      `"${s.studentName}"`,
      `"${s.studentEmail}"`,
      `"${s.className}"`,
      `"${s.status}"`,
      `"${s.submittedAt || '-'}"`,
      s.grade !== undefined ? s.grade : 'Ungraded',
      `"${s.gradedBy || '-'}"`,
      `"${(s.hypothesis || '').replace(/"/g, '""').substring(0, 100)}"`,
      s.dataTable?.length || 0,
      `"${(s.feedback || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AP_Physics_C_Lab01_Grades_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

export const labStorage = new LabStorageService();
