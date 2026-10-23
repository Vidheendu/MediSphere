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

export type Database = {
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: "doctors_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "doctors_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "doctors_speciality_id_fkey";
            columns: ["speciality_id"];
            isOneToOne: false;
            referencedRelation: "specialities";
            referencedColumns: ["id"];
          }
        ];
      };
      doctor_schedules: {
        Row: {
          id: string;
          doctor_id: string;
          day_of_week: DayOfWeek;
          start_time: string;
          end_time: string;
          break_start: string | null;
          break_end: string | null;
          appointment_duration: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          doctor_id: string;
          day_of_week: DayOfWeek;
          start_time: string;
          end_time: string;
          break_start?: string | null;
          break_end?: string | null;
          appointment_duration?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          doctor_id?: string;
          day_of_week?: DayOfWeek;
          start_time?: string;
          end_time?: string;
          break_start?: string | null;
          break_end?: string | null;
          appointment_duration?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "doctor_schedules_doctor_id_fkey";
            columns: ["doctor_id"];
            isOneToOne: false;
            referencedRelation: "doctors";
            referencedColumns: ["id"];
          }
        ];
      };
      appointment_slots: {
        Row: {
          id: string;
          doctor_id: string;
          slot_date: string;
          start_time: string;
          end_time: string;
          status: SlotStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          doctor_id: string;
          slot_date: string;
          start_time: string;
          end_time: string;
          status?: SlotStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          doctor_id?: string;
          slot_date?: string;
          start_time?: string;
          end_time?: string;
          status?: SlotStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointment_slots_doctor_id_fkey";
            columns: ["doctor_id"];
            isOneToOne: false;
            referencedRelation: "doctors";
            referencedColumns: ["id"];
          }
        ];
      };
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string;
          slot_id: string;
          appointment_date: string;
          start_time: string;
          end_time: string;
          status: AppointmentStatus;
          reason: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          doctor_id: string;
          slot_id: string;
          appointment_date: string;
          start_time: string;
          end_time: string;
          status?: AppointmentStatus;
          reason?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          doctor_id?: string;
          slot_id?: string;
          appointment_date?: string;
          start_time?: string;
          end_time?: string;
          status?: AppointmentStatus;
          reason?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey";
            columns: ["doctor_id"];
            isOneToOne: false;
            referencedRelation: "doctors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_slot_id_fkey";
            columns: ["slot_id"];
            isOneToOne: true;
            referencedRelation: "appointment_slots";
            referencedColumns: ["id"];
          }
        ];
      };
      doctor_reviews: {
        Row: {
          id: string;
          doctor_id: string;
          patient_id: string;
          appointment_id: string;
          rating: number;
          review_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          doctor_id: string;
          patient_id: string;
          appointment_id: string;
          rating: number;
          review_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          doctor_id?: string;
          patient_id?: string;
          appointment_id?: string;
          rating?: number;
          review_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "doctor_reviews_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: true;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "doctor_reviews_doctor_id_fkey";
            columns: ["doctor_id"];
            isOneToOne: false;
            referencedRelation: "doctors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "doctor_reviews_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          id: string;
          recipient_user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          related_appointment_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          related_appointment_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_user_id?: string;
          type?: NotificationType;
          title?: string;
          message?: string;
          related_appointment_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_user_id_fkey";
            columns: ["recipient_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_related_appointment_id_fkey";
            columns: ["related_appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      doctor_public_reviews: {
        Row: {
          id: string;
          doctor_id: string;
          rating: number;
          review_text: string | null;
          created_at: string;
          updated_at: string;
          patient_display_name: string;
        };
        Relationships: [];
      };
    };

    Functions: {
      book_appointment: {
        Args: {
          p_slot_id: string;
          p_reason?: string | null;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      update_doctor_appointment_status: {
        Args: {
          p_appointment_id: string;
          p_status: string;
        };
        Returns: Json;
      };
      submit_doctor_review: {
        Args: {
          p_appointment_id: string;
          p_rating: number;
          p_review_text?: string | null;
        };
        Returns: Json;
      };
      get_doctor_rating_stats: {
        Args: {
          p_doctor_id: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type NotificationType =
  | "appointment_booked"
  | "appointment_completed"
  | "appointment_no_show"
  | "appointment_cancelled"
  | "system";

export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type SlotStatus = "available" | "booked" | "blocked";

export type AppointmentStatus =
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Speciality = Database["public"]["Tables"]["specialities"]["Row"];
export type Clinic = Database["public"]["Tables"]["clinics"]["Row"];
export type Doctor = Database["public"]["Tables"]["doctors"]["Row"];
export type DoctorSchedule = Database["public"]["Tables"]["doctor_schedules"]["Row"];
export type AppointmentSlot = Database["public"]["Tables"]["appointment_slots"]["Row"];
export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
export type DoctorReview = Database["public"]["Tables"]["doctor_reviews"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export interface NotificationPreferences {
  emailAlerts: boolean;
  appointmentReminders: boolean;
  statusUpdates: boolean;
}


/**
 * Privacy-safe public review projection:
 * Strictly excludes patient email, phone, authentication IDs, and appointment notes.
 */
export interface PublicDoctorReview {
  id: string;
  doctor_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  patient_display_name: string;
}

/**
 * Aggregated rating statistics computed from verified MediSphere reviews.
 */
export interface DoctorRatingStats {
  averageRating: number | null;
  totalReviews: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

/**
 * Review eligibility evaluation for a given appointment
 */
export type ReviewEligibilityStatus =
  | "eligible"
  | "already_reviewed"
  | "not_completed"
  | "not_patient"
  | "unauthenticated";

export interface ReviewEligibilityResult {
  status: ReviewEligibilityStatus;
  eligible: boolean;
  message: string;
  existingReview?: DoctorReview | null;
}

/**
 * Extended Doctor type populated with relational joins:
 * - profile: linked Profile row (name, email, phone, location)
 * - speciality: linked Speciality row (name, slug, description)
 * - clinic: linked Clinic row (name, address, city, phone)
 */
export interface DoctorWithDetails extends Doctor {
  profile?: Profile | null;
  speciality?: Speciality | null;
  clinic?: Clinic | null;
  distanceKm?: number | null;
}

/**
 * Extended Appointment type populated with relational joins:
 * - doctor: linked Doctor record with profile, speciality, and clinic
 * - patient: linked Profile record of the patient
 * - slot: linked AppointmentSlot record
 */
export interface AppointmentWithDetails extends Appointment {
  doctor?: DoctorWithDetails | null;
  patient?: Profile | null;
  slot?: AppointmentSlot | null;
}





