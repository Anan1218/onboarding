export { goalService } from './services/goalService';
export { useGoals, useActiveGoals } from './hooks/useGoals';
export { useGoal } from './hooks/useGoal';
export { GoalForm } from './components/GoalForm';
export { GoalCard } from './components/GoalCard';
export { GoalList } from './components/GoalList';
export type { Goal, CreateGoalInput, GoalFormData, GoalStatus } from './types/goal.types';
export { mapDbGoalToGoal } from './types/goal.types';
