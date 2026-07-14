module.exports = [
"[project]/lib/api.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// API Configuration and Base Setup
__turbopack_context__.s([
    "aiAPI",
    ()=>aiAPI,
    "analyticsAPI",
    ()=>analyticsAPI,
    "attendanceAPI",
    ()=>attendanceAPI,
    "authAPI",
    ()=>authAPI,
    "billingAPI",
    ()=>billingAPI,
    "clearPending2FA",
    ()=>clearPending2FA,
    "clearTokens",
    ()=>clearTokens,
    "departmentAPI",
    ()=>departmentAPI,
    "etlAPI",
    ()=>etlAPI,
    "getAuthToken",
    ()=>getAuthToken,
    "getPending2FAUserId",
    ()=>getPending2FAUserId,
    "leaveAPI",
    ()=>leaveAPI,
    "notificationsAPI",
    ()=>notificationsAPI,
    "organizationSettingsAPI",
    ()=>organizationSettingsAPI,
    "performanceAPI",
    ()=>performanceAPI,
    "reportsAPI",
    ()=>reportsAPI,
    "setTokens",
    ()=>setTokens,
    "userAPI",
    ()=>userAPI
]);
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
// Access token persisted in sessionStorage — survives page refresh,
// cleared automatically when the browser tab closes.
const TOKEN_KEY = 'wn_access_token';
const getAuthToken = ()=>{
    if ("TURBOPACK compile-time truthy", 1) return null;
    //TURBOPACK unreachable
    ;
};
const setTokens = (token)=>{
    if ("TURBOPACK compile-time truthy", 1) return;
    //TURBOPACK unreachable
    ;
};
const setPending2FAUserId = (userId)=>{
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
};
const getPending2FAUserId = ()=>{
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return null;
};
const clearPending2FA = ()=>{
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
};
const clearTokens = ()=>{
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
};
// Base fetch wrapper with error handling
async function apiFetch(endpoint, options = {}) {
    const token = getAuthToken();
    const { skipAuthRefresh = false, ...fetchOptions } = options;
    const config = {
        ...fetchOptions,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...token && {
                Authorization: `Bearer ${token}`
            },
            ...fetchOptions.headers
        }
    };
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        // Handle 401 Unauthorized - try to refresh token
        if (response.status === 401 && !skipAuthRefresh && endpoint !== '/auth/refresh-token') {
            {
                try {
                    const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include'
                    });
                    if (refreshResponse.ok) {
                        const refreshJson = await refreshResponse.json();
                        const newToken = refreshJson.data?.accessToken || refreshJson.accessToken || refreshJson.token;
                        if (!newToken) {
                            throw new Error('Token refresh response missing access token');
                        }
                        setTokens(newToken);
                        // Retry original request with new token
                        config.headers.Authorization = `Bearer ${newToken}`;
                        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, config);
                        const retryData = await retryResponse.json();
                        if (!retryResponse.ok) {
                            throw new Error(retryData.message || 'Request failed');
                        }
                        return retryData;
                    } else {
                        clearTokens();
                        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
                        ;
                    }
                } catch (error) {
                    clearTokens();
                    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
                    ;
                    throw error;
                }
            }
        }
        const data = await response.json();
        if (!response.ok) {
            const err = new Error(data.message || data.error || 'Something went wrong');
            err.status = response.status;
            throw err;
        }
        return data;
    } catch (error) {
        // Only log unexpected errors (5xx / network). 4xx are business logic — callers handle them.
        if (!error.status || error.status >= 500) {
            console.error('API Error:', error);
        }
        throw error;
    }
}
const authAPI = {
    register: (userData)=>{
        // Backend expects: email, password, firstName, lastName, employeeId, role
        const registerData = {
            email: userData.email,
            password: userData.password,
            firstName: userData.firstName || userData.first_name,
            lastName: userData.lastName || userData.last_name,
            employeeId: userData.employeeId || userData.employee_id,
            role: userData.role || 'EMPLOYEE',
            departmentId: userData.departmentId,
            managerId: userData.managerId,
            designation: userData.designation,
            phone: userData.phone
        };
        return apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify(registerData)
        });
    },
    // Alias for backward compatibility - handles both employee and organization registration
    signup: async function(userData) {
        // Check if this is organization registration (has organization_name)
        if (userData.organization_name || userData.orgName) {
            // Split admin_name into firstName and lastName
            const [firstName, ...lastNameParts] = (userData.admin_name || '').split(' ');
            const lastName = lastNameParts.join(' ') || 'User';
            const orgData = {
                orgName: userData.organization_name || userData.orgName,
                ownerEmail: userData.admin_email || userData.ownerEmail,
                ownerPassword: userData.password,
                ownerFirstName: firstName || 'Admin',
                ownerLastName: lastName,
                industry: userData.industry || 'Technology',
                country: userData.country || 'Pakistan',
                phone: userData.phone,
                website: userData.company_domain ? `https://${userData.company_domain}` : undefined
            };
            try {
                return await apiFetch('/billing/register', {
                    method: 'POST',
                    body: JSON.stringify(orgData)
                });
            } catch (error) {
                console.error('Organization registration failed:', error);
                throw error;
            }
        } else {
            // Employee registration
            return this.register(userData);
        }
    },
    verifyOTP: (email, otp)=>apiFetch('/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({
                email,
                otp
            })
        }),
    login: async (email, password)=>{
        const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password
            })
        });
        // Backend returns either tokens+user or { requires2FA, userId } in data.
        if (data.data?.requires2FA && data.data?.userId) {
            clearTokens();
            setPending2FAUserId(data.data.userId);
        } else if (data.data && data.data.accessToken) {
            clearPending2FA();
            setTokens(data.data.accessToken);
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
        }
        return data;
    },
    superAdminLogin: async (email, password)=>{
        const data = await authAPI.login(email, password);
        if (data.data?.requires2FA) {
            return data;
        }
        const user = data.data?.user || data.user;
        if (user?.role !== 'SUPER_ADMIN') {
            clearTokens();
            throw new Error('Super admin access required');
        }
        return data;
    },
    forgotPassword: (email)=>apiFetch('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({
                email
            })
        }),
    resetPassword: (token, newPassword)=>apiFetch('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({
                token,
                newPassword
            })
        }),
    changePassword: (oldPassword, newPassword)=>apiFetch('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({
                oldPassword,
                newPassword
            })
        }),
    setup2FA: ()=>apiFetch('/auth/2fa/setup', {
            method: 'POST'
        }),
    verify2FA: (token)=>apiFetch('/auth/2fa/verify', {
            method: 'POST',
            body: JSON.stringify({
                token
            })
        }),
    disable2FA: (token)=>apiFetch('/auth/2fa/disable', {
            method: 'POST',
            body: JSON.stringify({
                token
            })
        }),
    validate2FA: async (userId, token)=>{
        const response = await apiFetch('/auth/2fa/validate', {
            method: 'POST',
            body: JSON.stringify({
                userId,
                token
            })
        });
        const accessToken = response.data?.accessToken;
        if (!accessToken) {
            throw new Error('2FA validation response missing access token');
        }
        setTokens(accessToken);
        let user;
        try {
            const userResponse = await apiFetch('/users/me', {
                skipAuthRefresh: true
            });
            user = userResponse.data || userResponse;
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
        } catch (error) {
            clearTokens();
            throw error;
        }
        clearPending2FA();
        return {
            ...response,
            data: {
                ...response.data,
                user
            }
        };
    },
    refreshToken: async ()=>{
        const res = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Refresh failed');
        const json = await res.json();
        const newToken = json.data?.accessToken || json.accessToken || json.token;
        if (newToken) setTokens(newToken);
        return newToken;
    },
    logout: async ()=>{
        const token = getAuthToken();
        try {
            if (token) {
                await apiFetch('/auth/logout', {
                    method: 'POST',
                    skipAuthRefresh: true
                });
            }
        } catch  {
        // Local logout should still complete if the server session is already invalid.
        } finally{
            clearTokens();
        }
    }
};
const attendanceAPI = {
    checkIn: async (latitude, longitude)=>{
        const response = await apiFetch('/attendance/check-in', {
            method: 'POST',
            body: JSON.stringify({
                latitude,
                longitude
            })
        });
        return response.data || response;
    },
    checkOut: async ()=>{
        const response = await apiFetch('/attendance/check-out', {
            method: 'POST'
        });
        return response.data || response;
    },
    ping: async ()=>{
        const response = await apiFetch('/attendance/ping', {
            method: 'POST'
        });
        return response.data || response;
    },
    getToday: async ()=>{
        const response = await apiFetch('/attendance/today');
        return response.data || response;
    },
    getMy: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/attendance/my${queryString ? `?${queryString}` : ''}`);
        // Backend returns { records, meta }
        return response.data?.records || response.records || response.data || response;
    },
    getAll: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/attendance${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    },
    getSummary: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/attendance/summary${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    },
    manualEntry: async (userId, date, checkIn, checkOut, status, notes)=>{
        const response = await apiFetch('/attendance/manual', {
            method: 'POST',
            body: JSON.stringify({
                userId,
                date,
                checkIn,
                checkOut,
                status,
                notes
            })
        });
        return response.data || response;
    },
    update: async (attendanceId, data)=>{
        const response = await apiFetch(`/attendance/${attendanceId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return response.data || response;
    },
    syncFromTMS: async (date)=>{
        const response = await apiFetch('/attendance/sync/tms', {
            method: 'POST',
            body: JSON.stringify({
                date
            })
        });
        return response.data || response;
    },
    getHolidays: async ()=>{
        const response = await apiFetch('/attendance/holidays');
        return response.data || response;
    },
    createHoliday: async (holidayData)=>{
        const response = await apiFetch('/attendance/holidays', {
            method: 'POST',
            body: JSON.stringify(holidayData)
        });
        return response.data || response;
    }
};
const leaveAPI = {
    apply: async (leaveData)=>{
        const response = await apiFetch('/leave', {
            method: 'POST',
            body: JSON.stringify(leaveData)
        });
        return response.data || response;
    },
    getMy: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/leave/my${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    },
    getPending: async ()=>{
        const response = await apiFetch('/leave/pending');
        return response.data || response;
    },
    getAll: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/leave${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    },
    getById: async (leaveId)=>{
        const response = await apiFetch(`/leave/${leaveId}`);
        return response.data || response;
    },
    approve: (leaveId, approverNote)=>apiFetch(`/leave/${leaveId}/approve`, {
            method: 'PUT',
            body: JSON.stringify({
                note: approverNote
            })
        }),
    reject: (leaveId, approverNote)=>apiFetch(`/leave/${leaveId}/reject`, {
            method: 'PUT',
            body: JSON.stringify({
                note: approverNote
            })
        }),
    cancel: (leaveId)=>apiFetch(`/leave/${leaveId}/cancel`, {
            method: 'PUT'
        }),
    getMyBalances: async ()=>{
        const response = await apiFetch('/leave/balances/me');
        return response.data || response;
    },
    getUserBalances: async (userId)=>{
        const response = await apiFetch(`/leave/balances/${userId}`);
        return response.data || response;
    },
    getPolicies: async ()=>{
        const response = await apiFetch('/leave/policies/all');
        return response.data || response;
    },
    uploadPolicyDocument: async (file)=>{
        const token = getAuthToken();
        const formData = new FormData();
        formData.append('document', file);
        const response = await fetch(`${API_BASE_URL}/leave/policy-documents/upload`, {
            method: 'POST',
            headers: {
                ...token && {
                    Authorization: `Bearer ${token}`
                }
            },
            body: formData
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Policy upload failed');
        return data.data || data;
    },
    extractPolicyDocument: async (documentId)=>{
        const response = await apiFetch(`/leave/policy-documents/${documentId}/extract`, {
            method: 'POST'
        });
        return response.data || response;
    },
    aiParsePolicyDocument: async (documentId)=>{
        const response = await apiFetch(`/leave/policy-documents/${documentId}/ai-parse`, {
            method: 'POST'
        });
        return response.data || response;
    },
    approvePolicyRules: async (documentId, rules)=>{
        const response = await apiFetch(`/leave/policy-documents/${documentId}/approve-rules`, {
            method: 'PUT',
            body: JSON.stringify(rules || {})
        });
        return response.data || response;
    },
    evaluate: async (leaveId)=>{
        const response = await apiFetch(`/leave/${leaveId}/evaluate`, {
            method: 'POST'
        });
        return response.data || response;
    },
    getDecisionExplanation: async (leaveId)=>{
        const response = await apiFetch(`/leave/${leaveId}/decision-explanation`);
        return response.data || response;
    }
};
const userAPI = {
    getMe: async ()=>{
        const response = await apiFetch('/users/me');
        return response.data || response;
    },
    updateMe: async (userData)=>{
        const response = await apiFetch('/users/me', {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
        return response.data || response;
    },
    getAll: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/users${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    },
    getById: async (userId)=>{
        const response = await apiFetch(`/users/${userId}`);
        return response.data || response;
    },
    create: async (userData)=>{
        // Transform frontend data to backend format
        const [firstName, ...lastNameParts] = (userData.name || '').split(' ');
        const lastName = lastNameParts.join(' ') || 'User';
        // Map role_id to role string
        const roleMap = {
            1: 'ADMIN',
            2: 'MANAGER',
            3: 'EMPLOYEE',
            0: 'SUPER_ADMIN'
        };
        // Generate employeeId if not provided
        const employeeId = userData.employeeId || `EMP-${Date.now().toString().slice(-6)}`;
        // Validate required fields before sending
        if (!userData.email || !userData.email.trim()) {
            throw new Error('Email is required');
        }
        // Helper function to convert to string or return undefined (not null, not empty string)
        const toStringOrUndefined = (value)=>{
            if (!value || value === '' || value === 'null' || value === 'undefined') {
                return undefined;
            }
            return String(value);
        };
        const backendData = {
            email: userData.email.trim(),
            firstName: userData.firstName || firstName || 'User',
            lastName: userData.lastName || lastName,
            employeeId: employeeId,
            role: userData.role || roleMap[userData.role_id] || 'EMPLOYEE'
        };
        // Only add optional fields if they have valid values
        const departmentId = toStringOrUndefined(userData.departmentId || userData.department_id);
        if (departmentId) backendData.departmentId = departmentId;
        const managerId = toStringOrUndefined(userData.managerId || userData.manager_id);
        if (managerId) backendData.managerId = managerId;
        const designation = userData.designation?.trim();
        if (designation) backendData.designation = designation;
        const phone = userData.phone?.trim();
        if (phone) backendData.phone = phone;
        const joiningDate = userData.joiningDate?.trim();
        if (joiningDate) backendData.joiningDate = joiningDate;
        // Include password if provided (optional - backend will auto-generate if not provided)
        const password = userData.password?.trim();
        if (password) backendData.password = password;
        console.log('Creating user with data:', backendData);
        const response = await apiFetch('/users', {
            method: 'POST',
            body: JSON.stringify(backendData)
        });
        return response.data || response;
    },
    update: async (userId, userData)=>{
        // Transform frontend data to backend format
        const updateData = {};
        // Handle name splitting if provided
        if (userData.name) {
            const [firstName, ...lastNameParts] = userData.name.split(' ');
            updateData.firstName = firstName || 'User';
            updateData.lastName = lastNameParts.join(' ') || 'User';
        }
        // Map role_id to role string if provided
        if (userData.role_id !== undefined) {
            const roleMap = {
                1: 'ADMIN',
                2: 'MANAGER',
                3: 'EMPLOYEE',
                0: 'SUPER_ADMIN'
            };
            updateData.role = roleMap[userData.role_id] || 'EMPLOYEE';
        }
        // Map other fields
        if (userData.email) updateData.email = userData.email;
        if (userData.firstName) updateData.firstName = userData.firstName;
        if (userData.lastName) updateData.lastName = userData.lastName;
        if (userData.employeeId) updateData.employeeId = userData.employeeId;
        if (userData.role) updateData.role = userData.role;
        // Convert IDs to strings (UUIDs)
        if (userData.departmentId || userData.department_id) {
            const deptId = userData.departmentId || userData.department_id;
            updateData.departmentId = deptId && deptId !== '' ? String(deptId) : null;
        }
        if (userData.managerId || userData.manager_id) {
            const mgrId = userData.managerId || userData.manager_id;
            updateData.managerId = mgrId && mgrId !== '' ? String(mgrId) : null;
        }
        if (userData.designation !== undefined) updateData.designation = userData.designation || null;
        if (userData.phone !== undefined) updateData.phone = userData.phone || null;
        if (userData.joiningDate !== undefined) updateData.joiningDate = userData.joiningDate || null;
        // Handle status -> isActive conversion
        if (userData.status !== undefined) {
            updateData.isActive = userData.status === 'Active';
        }
        const response = await apiFetch(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        return response.data || response;
    },
    deactivate: (userId)=>apiFetch(`/users/${userId}`, {
            method: 'DELETE'
        }),
    activate: (userId)=>apiFetch(`/users/${userId}/activate`, {
            method: 'PATCH'
        }),
    getByDepartment: async (deptId)=>{
        const response = await apiFetch(`/users/department/${deptId}`);
        return response.data || response;
    }
};
const departmentAPI = {
    getAll: async ()=>{
        const response = await apiFetch('/users/departments/all');
        return response.data || response;
    },
    create: async (departmentData)=>{
        const response = await apiFetch('/users/departments', {
            method: 'POST',
            body: JSON.stringify(departmentData)
        });
        return response.data || response;
    },
    update: async (departmentId, departmentData)=>{
        const response = await apiFetch(`/users/departments/${departmentId}`, {
            method: 'PUT',
            body: JSON.stringify(departmentData)
        });
        return response.data || response;
    },
    delete: async (departmentId)=>{
        const response = await apiFetch(`/users/departments/${departmentId}`, {
            method: 'DELETE'
        });
        return response.data || response;
    }
};
const analyticsAPI = {
    getDashboard: async ()=>{
        const response = await apiFetch('/analytics/dashboard');
        return response.data || response;
    },
    getAttendanceTrends: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/analytics/attendance/trends${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    },
    getAttendanceHeatmap: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/analytics/attendance/heatmap${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    },
    getDepartmentAttendance: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/analytics/attendance/department${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    },
    getLeaveSummary: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/analytics/leave/summary${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    },
    getLeaveTrends: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/analytics/leave/trends${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    },
    getLeaveByType: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/analytics/leave/by-type${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    },
    getHeadcount: async ()=>{
        const response = await apiFetch('/analytics/workforce/headcount');
        return response.data || response;
    },
    getTurnover: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/analytics/workforce/turnover${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    },
    getAuditLogs: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/analytics/audit/logs${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    },
    getPowerBIToken: async ()=>{
        const response = await apiFetch('/analytics/powerbi/token');
        return response.data || response;
    },
    getPowerBIEmbedToken: async ()=>{
        const response = await apiFetch('/analytics/powerbi/embed-token');
        return response.data || response;
    }
};
const reportsAPI = {
    generate: async (reportData)=>{
        const response = await apiFetch('/reports/generate', {
            method: 'POST',
            body: JSON.stringify(reportData)
        });
        return response.data || response;
    },
    getAll: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/reports${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    },
    attendance: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/reports/attendance${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    },
    leave: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/reports/leave${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    },
    performance: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/reports/performance${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    },
    department: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/reports/department${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    }
};
const billingAPI = {
    getPlans: async ()=>{
        const response = await apiFetch('/billing/plans');
        return response.data || response;
    },
    registerOrganization: (orgData)=>apiFetch('/billing/register', {
            method: 'POST',
            body: JSON.stringify(orgData)
        }),
    subscribe: (subscriptionData)=>apiFetch('/billing/subscribe', {
            method: 'POST',
            body: JSON.stringify(subscriptionData)
        }),
    upgrade: (upgradeData)=>apiFetch('/billing/upgrade', {
            method: 'POST',
            body: JSON.stringify(upgradeData)
        }),
    getSubscription: async (orgId)=>{
        const response = await apiFetch(`/billing/${orgId}/subscription`);
        return response.data || response;
    },
    getInvoices: async (orgId)=>{
        const response = await apiFetch(`/billing/${orgId}/invoices`);
        return response.data || response;
    },
    checkEmployeeLimit: async (orgId)=>{
        const response = await apiFetch(`/billing/${orgId}/employee-limit`);
        return response.data || response;
    },
    cancelSubscription: (orgId)=>apiFetch(`/billing/${orgId}/cancel`, {
            method: 'POST'
        })
};
const aiAPI = {
    chat: async (message)=>{
        const response = await apiFetch('/ai/chat', {
            method: 'POST',
            body: JSON.stringify({
                message
            })
        });
        return response.data || response;
    },
    leaveForecast: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/ai/predict/leave-forecast${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    },
    attendanceAnomaly: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/ai/predict/attendance-anomaly${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    },
    attritionRisk: async ()=>{
        const response = await apiFetch('/ai/predict/attrition-risk');
        return response.data || response;
    },
    predictPerformance: async (employeeId)=>{
        const response = await apiFetch('/ai/predict-performance', {
            method: 'POST',
            body: JSON.stringify({
                employeeId
            })
        });
        return response.data || response;
    }
};
const organizationSettingsAPI = {
    get: ()=>apiFetch('/settings/organization'),
    update: (settings)=>apiFetch('/settings/organization', {
            method: 'PUT',
            body: JSON.stringify(settings)
        })
};
const notificationsAPI = {
    getAll: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/notifications${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    },
    getUnreadCount: async ()=>{
        const response = await apiFetch('/notifications/unread-count');
        return response.data || response;
    },
    markAsRead: (notificationId)=>apiFetch(`/notifications/${notificationId}/read`, {
            method: 'PUT'
        }),
    markAllAsRead: ()=>apiFetch('/notifications/read-all', {
            method: 'PUT'
        }),
    delete: (notificationId)=>apiFetch(`/notifications/${notificationId}`, {
            method: 'DELETE'
        }),
    broadcast: (notificationData)=>apiFetch('/notifications/broadcast', {
            method: 'POST',
            body: JSON.stringify(notificationData)
        })
};
const performanceAPI = {
    getMy: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/performance/me${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    },
    getUser: async (userId, params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/performance/user/${userId}${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    },
    getTeam: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/performance/team${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    },
    getLeaderboard: async (params)=>{
        const queryString = new URLSearchParams(params).toString();
        const response = await apiFetch(`/performance/leaderboard${queryString ? `?${queryString}` : ''}`);
        return response.data || response;
    }
};
const etlAPI = {
    runETL: async (month, year)=>{
        const response = await apiFetch('/analytics/etl/run', {
            method: 'POST',
            body: JSON.stringify({
                month,
                year
            })
        });
        return response.data || response;
    },
    getLogs: async ()=>{
        const response = await apiFetch('/analytics/etl/logs');
        return response.data || response;
    },
    getStatus: async ()=>{
        const response = await apiFetch('/analytics/etl/logs');
        const logs = response.data || response;
        return Array.isArray(logs) ? logs[0] : logs;
    }
};
;
}),
"[project]/hooks/useAuth.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
;
;
;
function readStoredUser() {
    if ("TURBOPACK compile-time truthy", 1) return null;
    //TURBOPACK unreachable
    ;
    const storedUser = undefined;
}
function useAuth() {
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(readStoredUser);
    const [loading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const login = async (email, password)=>{
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authAPI"].login(email, password);
            // Backend returns: { success, message, data: { accessToken, refreshToken, user } }
            const user = response.data?.user || response.user;
            if (user) {
                setUser(user);
            } else if (response.data?.requires2FA) {
                setUser(null);
            }
            return response;
        } catch (error) {
            throw error;
        }
    };
    const superAdminLogin = async (email, password)=>{
        try {
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authAPI"].superAdminLogin(email, password);
            const user = response.data?.user || response.user;
            if (user) {
                setUser(user);
            }
            return response;
        } catch (error) {
            throw error;
        }
    };
    const signup = async (userData)=>{
        try {
            const data = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authAPI"].signup(userData);
            return data;
        } catch (error) {
            throw error;
        }
    };
    const logout = async ()=>{
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["authAPI"].logout();
        setUser(null);
        router.push('/login');
    };
    return {
        user,
        loading,
        login,
        superAdminLogin,
        signup,
        logout,
        isAuthenticated: !!user
    };
}
}),
"[project]/app/register/page.jsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>RegisterPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/eye.js [app-ssr] (ecmascript) <export default as Eye>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2d$off$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__EyeOff$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/eye-off.js [app-ssr] (ecmascript) <export default as EyeOff>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-ssr] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-right.js [app-ssr] (ecmascript) <export default as ArrowRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$useAuth$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/hooks/useAuth.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
;
;
const fadeInUp = {
    hidden: {
        opacity: 0,
        y: 24
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: [
                0.16,
                1,
                0.3,
                1
            ]
        }
    }
};
const stagger = {
    visible: {
        transition: {
            staggerChildren: 0.07
        }
    }
};
const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition text-sm';
function RegisterPage() {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const { signup } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$useAuth$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuth"])();
    const [formData, setFormData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({
        admin_name: '',
        admin_email: '',
        organization_name: '',
        subscription_plan: 'Pro',
        industry: '',
        company_domain: '',
        city: '',
        country: '',
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showConfirmPassword, setShowConfirmPassword] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const passwordRequirements = [
        {
            label: 'At least 8 characters',
            met: formData.password.length >= 8
        },
        {
            label: 'Contains uppercase letter',
            met: /[A-Z]/.test(formData.password)
        },
        {
            label: 'Contains lowercase letter',
            met: /[a-z]/.test(formData.password)
        },
        {
            label: 'Contains number',
            met: /[0-9]/.test(formData.password)
        }
    ];
    const handleChange = (e)=>{
        const { name, value } = e.target;
        setFormData((prev)=>({
                ...prev,
                [name]: value
            }));
        setError('');
    };
    const handleSubmit = async (e)=>{
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (!formData.admin_name || !formData.admin_email || !formData.password || !formData.confirmPassword || !formData.organization_name || !formData.industry || !formData.company_domain || !formData.city || !formData.country) {
                setError('Please fill in all required fields');
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                setError('Passwords do not match');
                return;
            }
            if (!passwordRequirements.every((r)=>r.met)) {
                setError('Password does not meet all requirements');
                return;
            }
            await signup({
                organization_name: formData.organization_name,
                admin_name: formData.admin_name,
                admin_email: formData.admin_email,
                password: formData.password,
                subscription_plan: formData.subscription_plan,
                industry: formData.industry,
                company_domain: formData.company_domain,
                city: formData.city,
                country: formData.country
            });
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].success('Account created successfully!', {
                description: 'You can now login with your credentials.',
                duration: 4000
            });
            router.push('/login');
        } catch (err) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally{
            setLoading(false);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden",
        style: {
            backgroundColor: '#070d1a'
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 pointer-events-none",
                style: {
                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)',
                    backgroundSize: '28px 28px'
                }
            }, void 0, false, {
                fileName: "[project]/app/register/page.jsx",
                lineNumber: 83,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none"
            }, void 0, false, {
                fileName: "[project]/app/register/page.jsx",
                lineNumber: 85,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute bottom-0 right-0 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl pointer-events-none"
            }, void 0, false, {
                fileName: "[project]/app/register/page.jsx",
                lineNumber: 86,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                initial: "hidden",
                animate: "visible",
                variants: stagger,
                className: "relative w-full max-w-lg",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                        variants: fadeInUp,
                        className: "text-center mb-7",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                href: "/",
                                className: "inline-flex items-center gap-2.5 mb-5 group",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                        src: "/logo.svg",
                                        alt: "WorkNexAI logo",
                                        className: "w-10 h-10 drop-shadow-[0_0_12px_rgba(56,189,248,0.35)] group-hover:drop-shadow-[0_0_16px_rgba(56,189,248,0.5)] transition"
                                    }, void 0, false, {
                                        fileName: "[project]/app/register/page.jsx",
                                        lineNumber: 92,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-white font-bold text-xl tracking-tight",
                                        children: [
                                            "WorkNex",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-sky-400",
                                                children: "AI"
                                            }, void 0, false, {
                                                fileName: "[project]/app/register/page.jsx",
                                                lineNumber: 93,
                                                columnNumber: 82
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/register/page.jsx",
                                        lineNumber: 93,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/register/page.jsx",
                                lineNumber: 91,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "text-3xl font-bold text-white mb-1",
                                children: "Create your account"
                            }, void 0, false, {
                                fileName: "[project]/app/register/page.jsx",
                                lineNumber: 95,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-white/40 text-sm",
                                children: "Set up WorkNexAI for your organization"
                            }, void 0, false, {
                                fileName: "[project]/app/register/page.jsx",
                                lineNumber: 96,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/register/page.jsx",
                        lineNumber: 90,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                        variants: fadeInUp,
                        className: "rounded-2xl border border-white/[0.07] bg-white/3 backdrop-blur-xl p-7 shadow-2xl shadow-black/40",
                        children: [
                            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                initial: {
                                    opacity: 0,
                                    y: -8
                                },
                                animate: {
                                    opacity: 1,
                                    y: 0
                                },
                                className: "mb-5 p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm",
                                children: error
                            }, void 0, false, {
                                fileName: "[project]/app/register/page.jsx",
                                lineNumber: 102,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                                onSubmit: handleSubmit,
                                className: "space-y-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-white/30 text-xs font-semibold uppercase tracking-wider mb-3",
                                                children: "Personal"
                                            }, void 0, false, {
                                                fileName: "[project]/app/register/page.jsx",
                                                lineNumber: 111,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "grid grid-cols-2 gap-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                className: "block text-white/50 text-xs font-medium mb-1.5",
                                                                children: "Full Name"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/register/page.jsx",
                                                                lineNumber: 114,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                type: "text",
                                                                name: "admin_name",
                                                                value: formData.admin_name,
                                                                onChange: handleChange,
                                                                placeholder: "John Doe",
                                                                className: inputClass
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/register/page.jsx",
                                                                lineNumber: 115,
                                                                columnNumber: 19
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/register/page.jsx",
                                                        lineNumber: 113,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                className: "block text-white/50 text-xs font-medium mb-1.5",
                                                                children: "Email Address"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/register/page.jsx",
                                                                lineNumber: 118,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                type: "email",
                                                                name: "admin_email",
                                                                value: formData.admin_email,
                                                                onChange: handleChange,
                                                                placeholder: "admin@company.com",
                                                                className: inputClass
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/register/page.jsx",
                                                                lineNumber: 119,
                                                                columnNumber: 19
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/register/page.jsx",
                                                        lineNumber: 117,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/register/page.jsx",
                                                lineNumber: 112,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/register/page.jsx",
                                        lineNumber: 110,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "border-t border-white/5"
                                    }, void 0, false, {
                                        fileName: "[project]/app/register/page.jsx",
                                        lineNumber: 124,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-white/30 text-xs font-semibold uppercase tracking-wider mb-3",
                                                children: "Organization"
                                            }, void 0, false, {
                                                fileName: "[project]/app/register/page.jsx",
                                                lineNumber: 128,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "space-y-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                className: "block text-white/50 text-xs font-medium mb-1.5",
                                                                children: "Company Name"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/register/page.jsx",
                                                                lineNumber: 131,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                type: "text",
                                                                name: "organization_name",
                                                                value: formData.organization_name,
                                                                onChange: handleChange,
                                                                placeholder: "Acme Corp",
                                                                className: inputClass
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/register/page.jsx",
                                                                lineNumber: 132,
                                                                columnNumber: 19
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/register/page.jsx",
                                                        lineNumber: 130,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "grid grid-cols-2 gap-3",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        className: "block text-white/50 text-xs font-medium mb-1.5",
                                                                        children: "Industry"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/register/page.jsx",
                                                                        lineNumber: 136,
                                                                        columnNumber: 21
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        type: "text",
                                                                        name: "industry",
                                                                        value: formData.industry,
                                                                        onChange: handleChange,
                                                                        placeholder: "Technology",
                                                                        className: inputClass
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/register/page.jsx",
                                                                        lineNumber: 137,
                                                                        columnNumber: 21
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/register/page.jsx",
                                                                lineNumber: 135,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        className: "block text-white/50 text-xs font-medium mb-1.5",
                                                                        children: "Company Domain"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/register/page.jsx",
                                                                        lineNumber: 140,
                                                                        columnNumber: 21
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        type: "text",
                                                                        name: "company_domain",
                                                                        value: formData.company_domain,
                                                                        onChange: handleChange,
                                                                        placeholder: "acme.com",
                                                                        className: inputClass
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/register/page.jsx",
                                                                        lineNumber: 141,
                                                                        columnNumber: 21
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/register/page.jsx",
                                                                lineNumber: 139,
                                                                columnNumber: 19
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/register/page.jsx",
                                                        lineNumber: 134,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "grid grid-cols-2 gap-3",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        className: "block text-white/50 text-xs font-medium mb-1.5",
                                                                        children: "City"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/register/page.jsx",
                                                                        lineNumber: 146,
                                                                        columnNumber: 21
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        type: "text",
                                                                        name: "city",
                                                                        value: formData.city,
                                                                        onChange: handleChange,
                                                                        placeholder: "New York",
                                                                        className: inputClass
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/register/page.jsx",
                                                                        lineNumber: 147,
                                                                        columnNumber: 21
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/register/page.jsx",
                                                                lineNumber: 145,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                        className: "block text-white/50 text-xs font-medium mb-1.5",
                                                                        children: "Country"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/register/page.jsx",
                                                                        lineNumber: 150,
                                                                        columnNumber: 21
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        type: "text",
                                                                        name: "country",
                                                                        value: formData.country,
                                                                        onChange: handleChange,
                                                                        placeholder: "USA",
                                                                        className: inputClass
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/register/page.jsx",
                                                                        lineNumber: 151,
                                                                        columnNumber: 21
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/register/page.jsx",
                                                                lineNumber: 149,
                                                                columnNumber: 19
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/register/page.jsx",
                                                        lineNumber: 144,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                className: "block text-white/50 text-xs font-medium mb-1.5",
                                                                children: "Subscription Plan"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/register/page.jsx",
                                                                lineNumber: 157,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "grid grid-cols-3 gap-2",
                                                                children: [
                                                                    'Basic',
                                                                    'Pro',
                                                                    'Enterprise'
                                                                ].map((plan)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        type: "button",
                                                                        onClick: ()=>setFormData((p)=>({
                                                                                    ...p,
                                                                                    subscription_plan: plan
                                                                                })),
                                                                        className: `py-2 rounded-xl text-xs font-semibold border transition-all ${formData.subscription_plan === plan ? 'border-blue-500/60 bg-blue-500/15 text-blue-300' : 'border-white/10 bg-white/5 text-white/35 hover:border-white/20 hover:text-white/60'}`,
                                                                        children: plan
                                                                    }, plan, false, {
                                                                        fileName: "[project]/app/register/page.jsx",
                                                                        lineNumber: 160,
                                                                        columnNumber: 23
                                                                    }, this))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/register/page.jsx",
                                                                lineNumber: 158,
                                                                columnNumber: 19
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/register/page.jsx",
                                                        lineNumber: 156,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/register/page.jsx",
                                                lineNumber: 129,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/register/page.jsx",
                                        lineNumber: 127,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "border-t border-white/5"
                                    }, void 0, false, {
                                        fileName: "[project]/app/register/page.jsx",
                                        lineNumber: 174,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-white/30 text-xs font-semibold uppercase tracking-wider mb-3",
                                                children: "Security"
                                            }, void 0, false, {
                                                fileName: "[project]/app/register/page.jsx",
                                                lineNumber: 178,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "grid grid-cols-2 gap-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                className: "block text-white/50 text-xs font-medium mb-1.5",
                                                                children: "Password"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/register/page.jsx",
                                                                lineNumber: 181,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "relative",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        type: showPassword ? 'text' : 'password',
                                                                        name: "password",
                                                                        value: formData.password,
                                                                        onChange: handleChange,
                                                                        placeholder: "••••••••",
                                                                        className: `${inputClass} pr-10`
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/register/page.jsx",
                                                                        lineNumber: 183,
                                                                        columnNumber: 21
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        type: "button",
                                                                        onClick: ()=>setShowPassword(!showPassword),
                                                                        className: "absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors",
                                                                        children: showPassword ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2d$off$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__EyeOff$3e$__["EyeOff"], {
                                                                            size: 15
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/register/page.jsx",
                                                                            lineNumber: 185,
                                                                            columnNumber: 39
                                                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__["Eye"], {
                                                                            size: 15
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/register/page.jsx",
                                                                            lineNumber: 185,
                                                                            columnNumber: 62
                                                                        }, this)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/register/page.jsx",
                                                                        lineNumber: 184,
                                                                        columnNumber: 21
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/register/page.jsx",
                                                                lineNumber: 182,
                                                                columnNumber: 19
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/register/page.jsx",
                                                        lineNumber: 180,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                className: "block text-white/50 text-xs font-medium mb-1.5",
                                                                children: "Confirm Password"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/register/page.jsx",
                                                                lineNumber: 190,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "relative",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        type: showConfirmPassword ? 'text' : 'password',
                                                                        name: "confirmPassword",
                                                                        value: formData.confirmPassword,
                                                                        onChange: handleChange,
                                                                        placeholder: "••••••••",
                                                                        className: `${inputClass} pr-10`
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/register/page.jsx",
                                                                        lineNumber: 192,
                                                                        columnNumber: 21
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        type: "button",
                                                                        onClick: ()=>setShowConfirmPassword(!showConfirmPassword),
                                                                        className: "absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors",
                                                                        children: showConfirmPassword ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2d$off$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__EyeOff$3e$__["EyeOff"], {
                                                                            size: 15
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/register/page.jsx",
                                                                            lineNumber: 194,
                                                                            columnNumber: 46
                                                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__["Eye"], {
                                                                            size: 15
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/register/page.jsx",
                                                                            lineNumber: 194,
                                                                            columnNumber: 69
                                                                        }, this)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/register/page.jsx",
                                                                        lineNumber: 193,
                                                                        columnNumber: 21
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/app/register/page.jsx",
                                                                lineNumber: 191,
                                                                columnNumber: 19
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/register/page.jsx",
                                                        lineNumber: 189,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/register/page.jsx",
                                                lineNumber: 179,
                                                columnNumber: 15
                                            }, this),
                                            formData.password && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                                                initial: {
                                                    opacity: 0,
                                                    height: 0
                                                },
                                                animate: {
                                                    opacity: 1,
                                                    height: 'auto'
                                                },
                                                className: "mt-3 grid grid-cols-2 gap-1.5",
                                                children: passwordRequirements.map((req, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center gap-1.5",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                                                size: 11,
                                                                className: req.met ? 'text-emerald-400' : 'text-white/15'
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/register/page.jsx",
                                                                lineNumber: 206,
                                                                columnNumber: 23
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: `text-xs transition-colors ${req.met ? 'text-emerald-400' : 'text-white/25'}`,
                                                                children: req.label
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/register/page.jsx",
                                                                lineNumber: 207,
                                                                columnNumber: 23
                                                            }, this)
                                                        ]
                                                    }, i, true, {
                                                        fileName: "[project]/app/register/page.jsx",
                                                        lineNumber: 205,
                                                        columnNumber: 21
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/app/register/page.jsx",
                                                lineNumber: 202,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/register/page.jsx",
                                        lineNumber: 177,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "flex items-start gap-2.5 cursor-pointer pt-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "checkbox",
                                                required: true,
                                                className: "w-4 h-4 rounded border-white/20 bg-white/5 accent-blue-500 mt-0.5 shrink-0"
                                            }, void 0, false, {
                                                fileName: "[project]/app/register/page.jsx",
                                                lineNumber: 216,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-white/30 text-xs leading-relaxed",
                                                children: [
                                                    "I agree to the",
                                                    ' ',
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                        href: "#",
                                                        className: "text-blue-400 hover:text-blue-300 transition-colors",
                                                        children: "Terms of Service"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/register/page.jsx",
                                                        lineNumber: 219,
                                                        columnNumber: 17
                                                    }, this),
                                                    ' ',
                                                    "and",
                                                    ' ',
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                        href: "#",
                                                        className: "text-blue-400 hover:text-blue-300 transition-colors",
                                                        children: "Privacy Policy"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/register/page.jsx",
                                                        lineNumber: 221,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/register/page.jsx",
                                                lineNumber: 217,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/register/page.jsx",
                                        lineNumber: 215,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].button, {
                                        type: "submit",
                                        disabled: loading,
                                        whileHover: {
                                            scale: 1.02
                                        },
                                        whileTap: {
                                            scale: 0.98
                                        },
                                        className: "w-full py-3 rounded-xl bg-linear-to-r from-cyan-400 via-sky-400 to-blue-500 text-[#04121f] font-bold text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/40 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
                                        children: loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/register/page.jsx",
                                                    lineNumber: 234,
                                                    columnNumber: 19
                                                }, this),
                                                " Creating Account..."
                                            ]
                                        }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                            children: [
                                                "Create Account ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__["ArrowRight"], {
                                                    size: 15
                                                }, void 0, false, {
                                                    fileName: "[project]/app/register/page.jsx",
                                                    lineNumber: 236,
                                                    columnNumber: 34
                                                }, this)
                                            ]
                                        }, void 0, true)
                                    }, void 0, false, {
                                        fileName: "[project]/app/register/page.jsx",
                                        lineNumber: 226,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/register/page.jsx",
                                lineNumber: 108,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/register/page.jsx",
                        lineNumber: 100,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].p, {
                        variants: fadeInUp,
                        className: "text-center text-white/25 text-sm mt-6",
                        children: [
                            "Already have an account?",
                            ' ',
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                href: "/login",
                                className: "text-blue-400 hover:text-blue-300 font-semibold transition-colors",
                                children: "Sign in"
                            }, void 0, false, {
                                fileName: "[project]/app/register/page.jsx",
                                lineNumber: 244,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/register/page.jsx",
                        lineNumber: 242,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/register/page.jsx",
                lineNumber: 88,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/register/page.jsx",
        lineNumber: 81,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=_6bbb579d._.js.map