import { SourceCharge } from '@/lib/physics/coulomb';
import { CircuitComponentData, CircuitWireData } from '@/lib/physics/mna-solver';
import { FieldSandboxControls } from '@/components/simulation/FieldSandbox';
import { CircuitWorkbenchControls } from '@/components/simulation/CircuitWorkbench';

export type UserRole = 'student' | 'instructor';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  classId: string;
  className: string;
  password?: string;
}

export interface CameraState {
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
}

export interface FieldSceneData {
  charges: SourceCharge[];
  controlsState: FieldSandboxControls;
  tracerSettings: {
    qMicro: number;
    massMicro: number;
    vx: number;
    vz: number;
    damping?: number;
    simSpeed?: number;
    lockToPlane?: boolean;
  };
}

export interface CircuitSceneData {
  components: CircuitComponentData[];
  wires: CircuitWireData[];
  controlsState: CircuitWorkbenchControls;
}

export interface SceneSnapshot {
  id: string;
  version: string;
  timestamp: string;
  title: string;
  description?: string;
  mode: 'field' | 'circuit' | 'projectile';
  fieldData?: FieldSceneData;
  circuitData?: CircuitSceneData;
  camera?: CameraState;
}

export interface SavedExperiment {
  id: string;
  userId: string;
  userName: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  snapshot: SceneSnapshot;
}

export interface LabDataRow {
  trial: number;
  distanceR: number; // in meters
  rSquared: number;
  measuredForce: number; // in N
  calculatedForce: number; // theoretical k*q1*q2 / r^2
  percentError: number; // in %
}

export interface LabAssignment {
  id: string;
  title: string;
  subtitle: string;
  topic: string;
  objectives: string[];
  fixedParameters: {
    q1Micro: number;
    q2Micro: number;
    kConstant: number;
  };
  rubric: {
    hypothesisMax: number;
    dataAccuracyMax: number;
    analysisMax: number;
    explanationMax: number;
    totalMax: number;
  };
}

export interface LabSubmission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  classId: string;
  className: string;
  status: 'draft' | 'submitted' | 'graded';
  submittedAt?: string;
  updatedAt: string;
  hypothesis: string;
  dataTable: LabDataRow[];
  analysisExplanation: string;
  conclusion: string;
  sceneSnapshot: SceneSnapshot;
  grade?: number;
  feedback?: string;
  gradedAt?: string;
  gradedBy?: string;
}
