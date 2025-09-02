// User Types
export interface IUser {
  id?: string; // UUID
  username: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'agent';
  status: 'active' | 'inactive';
  created_at?: Date;
  updated_at?: Date;
}

export interface IUserLogin {
  username: string;
  password: string;
}

export interface IUserRegister extends Omit<IUser, 'id' | 'created_at'> {
  password: string; // password_hash değil
}

export interface IUserResponse extends Omit<IUser, 'password_hash'> {}

// Customer Types
export interface ICustomer {
  id?: string; // UUID
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  customer_type: 'buyer' | 'seller' | 'both';
  budget_min?: number;
  budget_max?: number;
  status: 'active' | 'inactive';
  assigned_agent_id: string; // UUID
  created_at?: Date;
  updated_at?: Date;
  // Agent bilgileri (JOIN ile gelir)
  agent_username?: string;
  agent_first_name?: string;
  agent_last_name?: string;
}

export interface ICustomerCreate extends Omit<ICustomer, 'id' | 'created_at' | 'updated_at' | 'agent_username' | 'agent_first_name' | 'agent_last_name'> {}
export interface ICustomerUpdate extends Partial<ICustomer> {}

// Property Types
export interface IProperty {
  id?: string; // UUID
  title: string;
  description?: string;
  price: number;
  property_type: 'apartment' | 'house' | 'villa' | 'land' | 'commercial';
  bedrooms?: number;
  bathrooms?: number;
  area_sqm?: number;
  address?: string;
  city?: string;
  district?: string;
  status: 'active' | 'sold' | 'rented' | 'inactive' | 'deleted';
  created_at?: Date;
  updated_at?: Date;
  // İlişki bilgileri (JOIN ile gelir)
  listed_by_agent_id: string; // UUID
  owner_customer_id?: string; // UUID
  sold_to_customer_id?: string; // UUID
  agent_username?: string;
  agent_first_name?: string;
  agent_last_name?: string;
  owner_first_name?: string;
  owner_last_name?: string;
  owner_email?: string;
}

export interface IPropertyCreate extends Omit<IProperty, 'id' | 'created_at' | 'updated_at' | 'agent_username' | 'agent_first_name' | 'agent_last_name' | 'owner_first_name' | 'owner_last_name' | 'owner_email'> {}
export interface IPropertyUpdate extends Partial<IProperty> {}

// API Response Types
export interface IApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface IPaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// JWT Types
export interface IJwtPayload {
  userId: string; // UUID
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Request Types
export interface IAuthRequest extends Request {
  user?: IJwtPayload;
}

// Database Types
export interface IDatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}
