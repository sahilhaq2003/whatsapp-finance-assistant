export enum CategoryType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export interface Category {
  _id: string;
  businessId: string;
  name: string;
  type: CategoryType;
  isSystem: boolean;
  isActive: boolean;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  type: CategoryType;
}

export interface UpdateCategoryRequest {
  name: string;
}
