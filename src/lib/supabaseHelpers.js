import { supabase } from "./supabase.js";

// Helper function to calculate end time
const calculateEndTime = (startTime, durationMinutes) => {
  const [hours, minutes] = startTime.split(":").map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);

  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

  return endDate.toTimeString().slice(0, 5); // Returns HH:MM format
};

export const supabaseHelpers = {
  // Test database connection
  testConnection: async () => {
    try {
      const { error } = await supabase
        .from("services")
        .select("count")
        .limit(1);

      if (error) throw error;
      console.log("✅ Database connection successful");
      return { success: true };
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      return { success: false, error };
    }
  },

  // Services
  getServices: async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      return {
        success: true,
        data: data.map((service) => ({
          id: service.id,
          name: service.name,
          category: service.category,
          description: service.description || "",
          duration: service.duration_minutes,
          price: service.price,
          image: "✨",
          specialPricing: [],
        })),
      };
    } catch (error) {
      console.error("Error fetching services:", error);
      return { success: false, error };
    }
  },

  addService: async (serviceForm) => {
    try {
      const { data, error } = await supabase
        .from("services")
        .insert({
          name: serviceForm.name,
          category: serviceForm.category,
          description: serviceForm.description,
          duration_minutes: parseInt(serviceForm.duration),
          price: parseFloat(serviceForm.price),
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          id: data.id,
          name: data.name,
          category: data.category,
          description: data.description || "",
          duration: data.duration_minutes,
          price: data.price,
          image: "✨",
          specialPricing: [],
        },
      };
    } catch (error) {
      console.error("Error adding service:", error);
      return { success: false, error };
    }
  },

  updateService: async (serviceId, updates) => {
    try {
      const { data, error } = await supabase
        .from("services")
        .update({
          name: updates.name,
          category: updates.category,
          description: updates.description,
          duration_minutes: updates.duration,
          price: updates.price,
        })
        .eq("id", serviceId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error updating service:", error);
      return { success: false, error };
    }
  },

  deleteService: async (serviceId) => {
    try {
      const { error } = await supabase
        .from("services")
        .update({ is_active: false })
        .eq("id", serviceId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error deleting service:", error);
      return { success: false, error };
    }
  },

  // Staff Management
  getStaff: async () => {
    try {
      const { data, error } = await supabase
        .from("staff_members")
        .select(
          `
          *,
          user_profiles (
            full_name,
            phone,
            email
          ),
          staff_availability (
            day_of_week,
            start_time,
            end_time,
            is_available
          )
        `
        )
        .eq("is_active", true);

      if (error) throw error;

      return {
        success: true,
        data: data.map((staff) => {
          // Convert staff_availability array back to object format
          const availability = {
            sunday: { start: "", end: "", available: false },
            monday: { start: "09:00", end: "17:00", available: true },
            tuesday: { start: "09:00", end: "17:00", available: true },
            wednesday: { start: "09:00", end: "17:00", available: true },
            thursday: { start: "09:00", end: "17:00", available: true },
            friday: { start: "09:00", end: "17:00", available: true },
            saturday: { start: "10:00", end: "16:00", available: true },
          };

          const dayNames = [
            "sunday",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
          ];

          if (staff.staff_availability && Array.isArray(staff.staff_availability)) {
            staff.staff_availability.forEach((avail) => {
              const dayName = dayNames[avail.day_of_week];
              if (dayName) {
                availability[dayName] = {
                  start: avail.start_time || "",
                  end: avail.end_time || "",
                  available: avail.is_available || false,
                };
              }
            });
          }

          return {
            id: staff.id,
            name: staff.user_profiles?.full_name || "",
            phone: staff.user_profiles?.phone || "",
            email: staff.user_profiles?.email || "",
            bio: staff.bio || "",
            specialties: Array.isArray(staff.specialties)
              ? staff.specialties
              : [],
            avatar: "👤",
            profilePhoto: staff.profile_photo_url || undefined,
            availability: availability,
            gallery: [], // Will be loaded separately for performance
            notificationPreferences: {
              newBooking: "sms",
              cancellation: "sms",
              workInRequest: "sms",
            },
          };
        }),
      };
    } catch (error) {
      console.error("Error fetching staff:", error);
      return { success: false, error };
    }
  },

  addStaff: async (staffData) => {
    try {
      console.log("Creating staff with data:", staffData);

      // First create user profile
      const { data: userProfile, error: userError } = await supabase
        .from("user_profiles")
        .insert({
          full_name: staffData.name,
          phone: staffData.phone,
          email: staffData.email && staffData.email.trim() ? staffData.email.trim() : null,
          role: "stylist",
        })
        .select()
        .single();

      if (userError) {
        console.error("User profile creation error:", userError);
        throw userError;
      }

      console.log("User profile created:", userProfile.id);

      // Then create staff member
      const { data, error } = await supabase
        .from("staff_members")
        .insert({
          user_id: userProfile.id,
          bio: staffData.bio,
          specialties: staffData.specialties
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s),
          is_active: true,
        })
        .select(
          `
          *,
          user_profiles (
            full_name,
            phone,
            email
          )
        `
        )
        .single();

      if (error) {
        console.error("Staff member creation error:", error);
        throw error;
      }

      console.log("Staff member created:", data.id);

      // Add availability data
      const dayMapping = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };

      const availabilityRecords = Object.entries(staffData.availability).map(
        ([day, schedule]) => ({
          staff_id: data.id,
          day_of_week: dayMapping[day],
          start_time: schedule.start,
          end_time: schedule.end,
          is_available: schedule.available,
        })
      );

      console.log("Saving availability records:", availabilityRecords);
      
      const { error: availabilityError } = await supabase
        .from("staff_availability")
        .insert(availabilityRecords);

      if (availabilityError) {
        console.error("Error saving availability:", availabilityError);
        // Don't fail the whole operation, just log the error
      } else {
        console.log("✅ Availability saved successfully");
      }

      return {
        success: true,
        data: {
          id: data.id,
          name: data.user_profiles?.full_name || "",
          phone: data.user_profiles?.phone || "",
          email: data.user_profiles?.email || "",
          bio: data.bio || "",
          specialties: Array.isArray(data.specialties) ? data.specialties : [],
          avatar: "👤",
          profilePhoto: undefined,
          availability: staffData.availability,
          gallery: [],
          notificationPreferences: {
            newBooking: "sms",
            cancellation: "sms",
            workInRequest: "sms",
          },
        },
      };
    } catch (error) {
      console.error("Error adding staff:", error);
      return { success: false, error };
    }
  },

  updateStaff: async (staffId, updates) => {
    try {
      // First get the staff member to find the user_id
      const { data: staffMember, error: staffError } = await supabase
        .from("staff_members")
        .select("user_id")
        .eq("id", staffId)
        .single();

      if (staffError) throw staffError;

      // Update user profile
      if (staffMember.user_id) {
        const { error: userError } = await supabase
          .from("user_profiles")
          .update({
            full_name: updates.name,
            phone: updates.phone,
            email: updates.email,
          })
          .eq("id", staffMember.user_id);

        if (userError) throw userError;
      }

      // Update staff member
      const { data, error } = await supabase
        .from("staff_members")
        .update({
          bio: updates.bio,
          specialties: updates.specialties,
          profile_photo_url: updates.profilePhoto,
        })
        .eq("id", staffId)
        .select(
          `
          *,
          user_profiles (
            full_name,
            phone,
            email
          )
        `
        )
        .single();

      if (error) throw error;

      // Update availability if provided
      if (updates.availability) {
        // First delete existing availability records
        const { error: deleteError } = await supabase
          .from("staff_availability")
          .delete()
          .eq("staff_id", staffId);

        if (deleteError) {
          console.error("Error deleting old availability:", deleteError);
        }

        // Then insert new availability records
        const dayMapping = {
          sunday: 0,
          monday: 1,
          tuesday: 2,
          wednesday: 3,
          thursday: 4,
          friday: 5,
          saturday: 6,
        };

        const availabilityRecords = Object.entries(updates.availability).map(
          ([day, schedule]) => ({
            staff_id: staffId,
            day_of_week: dayMapping[day],
            start_time: schedule.start,
            end_time: schedule.end,
            is_available: schedule.available,
          })
        );

        const { error: availabilityError } = await supabase
          .from("staff_availability")
          .insert(availabilityRecords);

        if (availabilityError) {
          console.error("Error updating availability:", availabilityError);
          // Don't fail the whole operation, just log the error
        }
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error updating staff:", error);
      return { success: false, error };
    }
  },

  deleteStaff: async (staffId, hardDelete = false) => {
    try {
      if (hardDelete) {
        // Hard delete - remove all data
        const { error: availabilityError } = await supabase
          .from("staff_availability")
          .delete()
          .eq("staff_id", staffId);

        if (availabilityError) {
          console.error("Error deleting availability:", availabilityError);
        }

        const { error } = await supabase
          .from("staff_members")
          .delete()
          .eq("id", staffId);

        if (error) throw error;
      } else {
        // Soft delete - just deactivate
        const { error } = await supabase
          .from("staff_members")
          .update({ is_active: false })
          .eq("id", staffId);

        if (error) throw error;
      }

      return { success: true };
    } catch (error) {
      console.error("Error deleting staff:", error);
      return { success: false, error };
    }
  },

  // Customer Management
  addCustomer: async (customerData) => {
    try {
      console.log("Creating customer with data:", customerData);

      // First create user profile
      const { data: userProfile, error: userError } = await supabase
        .from("user_profiles")
        .insert({
          full_name: customerData.name,
          phone: customerData.phone,
          email: customerData.email && customerData.email.trim() ? customerData.email.trim() : null,
          role: "customer",
        })
        .select()
        .single();

      if (userError) {
        console.error("Customer user profile error:", userError);
        throw userError;
      }

      console.log("Customer user profile created:", userProfile.id);

      // Then create customer
      const { data, error } = await supabase
        .from("customers")
        .insert({
          user_id: userProfile.id,
          notes: customerData.notes || "",
          preferred_contact: customerData.preferredContact || "sms",
        })
        .select(
          `
          *,
          user_profiles (
            full_name,
            phone,
            email
          )
        `
        )
        .single();

      if (error) {
        console.error("Customer creation error:", error);
        throw error;
      }

      console.log("Customer created successfully:", data.id);

      return {
        success: true,
        data: {
          id: data.id,
          name: data.user_profiles?.full_name || "",
          phone: data.user_profiles?.phone || "",
          email: data.user_profiles?.email || "",
          notes: data.notes || "",
          lastVisit: "",
          avatar: "👤",
          preferredContact: data.preferred_contact || "sms",
        },
      };
    } catch (error) {
      console.error("Error adding customer:", error);
      return { success: false, error };
    }
  },

  updateCustomer: async (customerId, updates) => {
    try {
      // First get the customer to find the user_id
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("user_id")
        .eq("id", customerId)
        .single();

      if (customerError) throw customerError;

      // Update user profile
      if (customer.user_id) {
        const { error: userError } = await supabase
          .from("user_profiles")
          .update({
            full_name: updates.name,
            phone: updates.phone,
            email: updates.email,
          })
          .eq("id", customer.user_id);

        if (userError) throw userError;
      }

      // Update customer
      const { data, error } = await supabase
        .from("customers")
        .update({
          notes: updates.notes,
          preferred_contact: updates.preferredContact,
        })
        .eq("id", customerId)
        .select(
          `
          *,
          user_profiles (
            full_name,
            phone,
            email
          )
        `
        )
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error updating customer:", error);
      return { success: false, error };
    }
  },

  getCustomers: async () => {
    try {
      const { data, error } = await supabase.from("customers").select(`
        *,
        user_profiles (
          full_name,
          phone,
          email
        )
      `);

      if (error) throw error;

      return {
        success: true,
        data: data.map((customer) => ({
          id: customer.id,
          name: customer.user_profiles?.full_name || "",
          phone: customer.user_profiles?.phone || "",
          email: customer.user_profiles?.email || "",
          notes: customer.notes || "",
          lastVisit: customer.last_visit || "",
          avatar: "👤",
          preferredContact: customer.preferred_contact || "sms",
        })),
      };
    } catch (error) {
      console.error("Error fetching customers:", error);
      return { success: false, error };
    }
  },

  deleteCustomer: async (customerId) => {
    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error deleting customer:", error);
      return { success: false, error };
    }
  },

  // Appointments Management
  getAppointments: async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("archived", false)
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data: data.map((appointment) => ({
          id: appointment.id,
          clientId: appointment.customer_id,
          staffId: appointment.staff_id,
          serviceId: appointment.service_id,
          date: appointment.appointment_date,
          time: appointment.start_time,
          endTime: appointment.end_time,
          status:
            appointment.status === "scheduled"
              ? "confirmed"
              : appointment.status,
          notes: appointment.notes || "",
          isCallIn: appointment.is_call_in || false,
          isWorkInApproval: appointment.is_work_in_approval || false,
        })),
      };
    } catch (error) {
      console.error("Error fetching appointments:", error);
      return { success: false, error };
    }
  },

  createAppointment: async (appointmentData) => {
    try {
      console.log("Creating appointment with data:", appointmentData);

      // Validate required data
      if (
        !appointmentData.customerSupabaseId ||
        !appointmentData.staffSupabaseId ||
        !appointmentData.serviceSupabaseId
      ) {
        throw new Error("Missing required appointment data");
      }

      // Get service duration to calculate end time
      const { data: service, error: serviceError } = await supabase
        .from("services")
        .select("duration_minutes")
        .eq("id", appointmentData.serviceSupabaseId)
        .single();

      if (serviceError) {
        console.error("Error fetching service:", serviceError);
        throw serviceError;
      }

      // Calculate end time in the application
      const endTime = calculateEndTime(
        appointmentData.time,
        service.duration_minutes
      );
      console.log(
        `Calculated end time: ${endTime} (start: ${appointmentData.time}, duration: ${service.duration_minutes} mins)`
      );

      const { data, error } = await supabase
        .from("appointments")
        .insert({
          customer_id: appointmentData.customerSupabaseId,
          staff_id: appointmentData.staffSupabaseId,
          service_id: appointmentData.serviceSupabaseId,
          appointment_date: appointmentData.date,
          start_time: appointmentData.time,
          end_time: endTime, // Calculate end time in application
          status:
            appointmentData.status === "confirmed"
              ? "scheduled"
              : appointmentData.status,
          notes: appointmentData.notes || "",
          is_call_in: appointmentData.isCallIn || false,
          is_work_in_approval: appointmentData.isWorkInApproval || false,
          archived: false,
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase appointment creation error:", error);
        throw error;
      }

      console.log("Appointment created successfully:", data);

      return {
        success: true,
        data: {
          id: data.id,
          clientId: data.customer_id,
          staffId: data.staff_id,
          serviceId: data.service_id,
          date: data.appointment_date,
          time: data.start_time,
          endTime: data.end_time,
          status: data.status === "scheduled" ? "confirmed" : data.status,
          notes: data.notes || "",
          isCallIn: data.is_call_in || false,
          isWorkInApproval: data.is_work_in_approval || false,
        },
      };
    } catch (error) {
      console.error("Error creating appointment:", error);
      return { success: false, error };
    }
  },

  updateAppointment: async (appointmentId, updates) => {
    try {
      console.log("Updating appointment with data:", updates);

      // If time is being updated, recalculate end time
      let endTime = null;
      if (updates.time) {
        // Get service duration to calculate end time
        const { data: appointment, error: appointmentError } = await supabase
          .from("appointments")
          .select("service_id")
          .eq("id", appointmentId)
          .single();

        if (appointmentError) {
          console.error("Error fetching appointment for service:", appointmentError);
          throw appointmentError;
        }

        const { data: service, error: serviceError } = await supabase
          .from("services")
          .select("duration_minutes")
          .eq("id", appointment.service_id)
          .single();

        if (serviceError) {
          console.error("Error fetching service:", serviceError);
          throw serviceError;
        }

        endTime = calculateEndTime(updates.time, service.duration_minutes);
        console.log(`Calculated new end time: ${endTime} (start: ${updates.time}, duration: ${service.duration_minutes} mins)`);
      }

      const updateData = {
        appointment_date: updates.date,
        start_time: updates.time,
        end_time: endTime,
        status: updates.status === "confirmed" ? "scheduled" : updates.status,
        notes: updates.notes,
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const { data, error } = await supabase
        .from("appointments")
        .update(updateData)
        .eq("id", appointmentId)
        .select()
        .single();

      if (error) {
        console.error("Supabase appointment update error:", error);
        throw error;
      }

      console.log("Appointment updated successfully:", data);

      return {
        success: true,
        data: {
          id: data.id,
          clientId: data.customer_id,
          staffId: data.staff_id,
          serviceId: data.service_id,
          date: data.appointment_date,
          time: data.start_time,
          endTime: data.end_time,
          status: data.status === "scheduled" ? "confirmed" : data.status,
          notes: data.notes || "",
          isCallIn: data.is_call_in || false,
          isWorkInApproval: data.is_work_in_approval || false,
        },
      };
    } catch (error) {
      console.error("Error updating appointment:", error);
      return { success: false, error };
    }
  },

  deleteAppointment: async (appointmentId) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ archived: true, archived_at: new Date().toISOString() })
        .eq("id", appointmentId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error deleting appointment:", error);
      return { success: false, error };
    }
  },

  // Work-in Requests
  getWorkInRequests: async () => {
    try {
      const { data, error } = await supabase
        .from("work_in_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data.map((request) => ({
          id: request.id,
          clientId: 0, // Work-in requests don't have existing customer IDs
          staffId: request.staff_id,
          serviceId: request.service_id,
          requestedDate: request.requested_date,
          requestedTime: request.requested_time === "01:00" ? "flexible" : request.requested_time,
          customerInfo: {
            name: request.customer_name || "",
            phone: request.customer_phone || "",
            email: request.customer_email || "",
            notes: request.customer_notes || "",
            preferredContact: request.preferred_contact || "sms",
          },
          status: request.status,
          requestTime: request.request_time || request.created_at,
          responseTime: request.response_time,
          notes: request.response_notes || "",
        })),
      };
    } catch (error) {
      console.error("Error fetching work-in requests:", error);
      return { success: false, error };
    }
  },

  createWorkInRequest: async (requestData) => {
    try {
      console.log("Creating work-in request with data:", requestData);

      // Handle null/empty time values properly
      const requestedTime = requestData.requestedTime && requestData.requestedTime.trim() ? requestData.requestedTime : null;

      const { data, error } = await supabase
        .from("work_in_requests")
        .insert({
          staff_id: requestData.staffSupabaseId,
          service_id: requestData.serviceSupabaseId,
          customer_name: requestData.customerInfo.name,
          customer_phone: requestData.customerInfo.phone,
          customer_email: requestData.customerInfo.email,
          customer_notes: requestData.customerInfo.notes,
          requested_date: requestData.requestedDate,
          requested_time: requestedTime,
          preferred_contact: requestData.customerInfo.preferredContact || "sms",
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          id: data.id,
          clientId: 0,
          staffId: data.staff_id,
          serviceId: data.service_id,
          requestedDate: data.requested_date,
          requestedTime: data.requested_time === "01:00" ? "flexible" : data.requested_time,
          customerInfo: {
            name: data.customer_name,
            phone: data.customer_phone,
            email: data.customer_email || "",
            notes: data.customer_notes || "",
            preferredContact: data.preferred_contact || "sms",
          },
          status: data.status,
          requestTime: data.created_at,
          notes: "",
        },
      };
    } catch (error) {
      console.error("Error creating work-in request:", error);
      return { success: false, error };
    }
  },

  updateWorkInRequest: async (requestId, updates) => {
    try {
      const { data, error } = await supabase
        .from("work_in_requests")
        .update({
          status: updates.status,
          response_time: new Date().toISOString(),
          response_notes: updates.notes,
        })
        .eq("id", requestId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error updating work-in request:", error);
      return { success: false, error };
    }
  },

  deleteWorkInRequest: async (requestId) => {
    try {
      const { error } = await supabase
        .from("work_in_requests")
        .delete()
        .eq("id", requestId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error deleting work-in request:", error);
      return { success: false, error };
    }
  },

  // Gallery Management
  getGalleryImages: async (staffMemberId) => {
    try {
      const { data, error } = await supabase
        .from("gallery_images")
        .select("*")
        .eq("staff_member_id", staffMemberId)
        .eq("is_active", true)
        .order("upload_date", { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data.map((image) => ({
          id: image.id,
          url: image.image_url,
          caption: image.caption,
          uploadDate: image.upload_date,
          isBeforeAfter: image.is_before_after,
        })),
      };
    } catch (error) {
      console.error("Error fetching gallery images:", error);
      return { success: false, error };
    }
  },

  addGalleryImage: async (imageData) => {
    try {
      const { data, error } = await supabase
        .from("gallery_images")
        .insert({
          staff_member_id: imageData.staffMemberId,
          image_url: imageData.imageUrl,
          caption: imageData.caption,
          is_before_after: imageData.isBeforeAfter,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          id: data.id,
          url: data.image_url,
          caption: data.caption,
          uploadDate: data.upload_date,
          isBeforeAfter: data.is_before_after,
        },
      };
    } catch (error) {
      console.error("Error adding gallery image:", error);
      return { success: false, error };
    }
  },

  updateGalleryImage: async (imageId, updates) => {
    try {
      const { data, error } = await supabase
        .from("gallery_images")
        .update({
          image_url: updates.imageUrl,
          caption: updates.caption,
          is_before_after: updates.isBeforeAfter,
          updated_at: new Date().toISOString(),
        })
        .eq("id", imageId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          id: data.id,
          url: data.image_url,
          caption: data.caption,
          uploadDate: data.upload_date,
          isBeforeAfter: data.is_before_after,
        },
      };
    } catch (error) {
      console.error("Error updating gallery image:", error);
      return { success: false, error };
    }
  },

  deleteGalleryImage: async (imageId) => {
    try {
      const { error } = await supabase
        .from("gallery_images")
        .update({ is_active: false })
        .eq("id", imageId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error deleting gallery image:", error);
      return { success: false, error };
    }
  },
};
export default supabaseHelpers;
