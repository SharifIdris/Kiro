// User-related types
export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  profile: UserProfile;
  gamificationStats: GamificationStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  skills: string[];
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  ideaUpdates: boolean;
  votingResults: boolean;
  achievements: boolean;
}

export interface PrivacySettings {
  showInLeaderboard: boolean;
  shareProfile: boolean;
  allowCollaboration: boolean;
}

export interface GamificationStats {
  points: number;
  level: number;
  badges: Badge[];
  achievements: Achievement[];
  leaderboardRank?: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  criteria: string;
  points: number;
  unlockedAt: Date;
}

export enum UserRole {
  USER = 'user',
  TEAM_LEAD = 'team_lead',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

// Idea-related types
export interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  submitterId: string;
  collaborators: string[];
  status: IdeaStatus;
  votingStats: VotingStats;
  aiRefinements: AIRefinement[];
  generatedCode?: GeneratedCode;
  deploymentInfo?: DeploymentInfo;
  createdAt: Date;
  updatedAt: Date;
}

export enum IdeaStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  IN_DEVELOPMENT = 'in_development',
  TESTING = 'testing',
  DEPLOYED = 'deployed',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}

export interface VotingStats {
  upvotes: number;
  downvotes: number;
  totalVotes: number;
  weightedScore: number;
  voterIds: string[];
}

export interface Vote {
  id: string;
  userId: string;
  ideaId: string;
  type: VoteType;
  createdAt: Date;
}

export enum VoteType {
  UPVOTE = 'upvote',
  DOWNVOTE = 'downvote',
  ABSTAIN = 'abstain',
}

// AI and Code Generation types
export interface AIRefinement {
  id: string;
  version: number;
  suggestions: string[];
  appliedSuggestions: string[];
  feedback: string;
  createdAt: Date;
}

export interface GeneratedCode {
  id: string;
  architecture: TechArchitecture;
  frontend: CodeArtifact;
  backend: CodeArtifact;
  database: DatabaseSchema;
  tests: TestSuite;
  documentation: string;
  generatedAt: Date;
}

export interface TechArchitecture {
  frontend: TechStack;
  backend: TechStack;
  database: DatabaseType;
  deployment: DeploymentPlatform;
  diagram: string; // Mermaid diagram
  rationale: string;
}

export interface TechStack {
  framework: string;
  language: string;
  libraries: string[];
  buildTools: string[];
}

export enum DatabaseType {
  POSTGRESQL = 'postgresql',
  MYSQL = 'mysql',
  MONGODB = 'mongodb',
  SQLITE = 'sqlite',
}

export enum DeploymentPlatform {
  AWS = 'aws',
  GCP = 'gcp',
  AZURE = 'azure',
  VERCEL = 'vercel',
  NETLIFY = 'netlify',
}

export interface CodeArtifact {
  files: CodeFile[];
  dependencies: string[];
  buildConfig: Record<string, any>;
}

export interface CodeFile {
  path: string;
  content: string;
  language: string;
}

export interface DatabaseSchema {
  tables: TableSchema[];
  migrations: string[];
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  indexes: IndexSchema[];
  relationships: RelationshipSchema[];
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  defaultValue?: any;
}

export interface IndexSchema {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface RelationshipSchema {
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  targetTable: string;
  foreignKey: string;
  targetKey: string;
}

export interface TestSuite {
  unitTests: TestFile[];
  integrationTests: TestFile[];
  e2eTests: TestFile[];
  coverage: TestCoverage;
}

export interface TestFile {
  path: string;
  content: string;
  framework: string;
}

export interface TestCoverage {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

// Deployment types
export interface DeploymentInfo {
  id: string;
  status: DeploymentStatus;
  environments: Environment[];
  urls: DeploymentUrls;
  infrastructure: InfrastructureConfig;
  monitoring: MonitoringConfig;
  deployedAt: Date;
}

export enum DeploymentStatus {
  PENDING = 'pending',
  BUILDING = 'building',
  DEPLOYING = 'deploying',
  DEPLOYED = 'deployed',
  FAILED = 'failed',
  ROLLING_BACK = 'rolling_back',
}

export interface Environment {
  name: string;
  url: string;
  status: EnvironmentStatus;
  resources: CloudResource[];
  lastDeployment: Date;
}

export enum EnvironmentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  ERROR = 'error',
}

export interface DeploymentUrls {
  web?: string;
  api?: string;
  admin?: string;
  preview?: string;
}

export interface InfrastructureConfig {
  provider: DeploymentPlatform;
  region: string;
  resources: CloudResource[];
  scaling: ScalingConfig;
}

export interface CloudResource {
  type: string;
  name: string;
  config: Record<string, any>;
  status: string;
}

export interface ScalingConfig {
  minInstances: number;
  maxInstances: number;
  targetCPU: number;
  targetMemory: number;
}

export interface MonitoringConfig {
  metrics: string[];
  alerts: AlertConfig[];
  logs: LogConfig;
}

export interface AlertConfig {
  name: string;
  condition: string;
  threshold: number;
  action: string;
}

export interface LogConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  retention: number;
  format: 'json' | 'text';
}

// Comment and Collaboration types
export interface Comment {
  id: string;
  ideaId: string;
  userId: string;
  content: string;
  parentId?: string;
  replies: Comment[];
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}