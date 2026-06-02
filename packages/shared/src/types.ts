export interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  error: {
    message: string;
    code: string;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export type UserRole = "user" | "stylist" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface Stylist {
  id: string;
  userId: string;
  name: string;
  specialty: string;
  rating: number;
  location: string;
  avatar?: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  priceFrom: number;
  duration: number;
}

export interface Booking {
  id: string;
  userId: string;
  stylistId: string;
  serviceId: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  createdAt: string;
}
