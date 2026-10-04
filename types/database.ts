export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "patient" | "doctor" | "admin";
export type DoctorVerificationStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "suspended";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          email: string | null;
          location: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          email?: string | null;
          location?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          email?: string | null;
          location?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      specialities: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      clinics: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          city: string | null;
          state: string | null;
          pincode: string | null;
          phone: string | null;
          website: string | null;
          latitude: number | null;
          longitude: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          pincode?: string | null;
          phone?: string | null;
          website?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          pincode?: string | null;
          phone?: string | null;
          website?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      doctors: {
        Row: {
          id: string;
          profile_id: string;
          speciality_id: string | null;
          clinic_id: string | null;
          qualification: string | null;
          experience_years: number | null;
          consultation_fee: number | null;
          about: string | null;
          verification_status: DoctorVerificationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          speciality_id?: string | null;
          clinic_id?: string | null;
          qualification?: string | null;
          experience_years?: number | null;
          consultation_fee?: number | null;
          about?: string | null;
          verification_status?: DoctorVerificationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          speciality_id?: string | null;
          clinic_id?: string | null;
          qualification?: string | null;
          experience_years?: number | null;
          consultation_fee?: number | null;
          about?: string | null;
          verification_status?: DoctorVerificationStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Speciality = Database["public"]["Tables"]["specialities"]["Row"];
export type Clinic = Database["public"]["Tables"]["clinics"]["Row"];
export type Doctor = Database["public"]["Tables"]["doctors"]["Row"];
