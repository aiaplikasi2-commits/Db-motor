/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import type { MotorItem, Customer, SalesProfile } from './types';
import { Header } from './components/Header';
import { BottomNav, type TabType } from './components/BottomNav';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { DashboardView } from './pages/DashboardView';
import { MotorView } from './pages/MotorView';
import { MotorDetailView } from './pages/MotorDetailView';
import { CustomerView } from './pages/CustomerView';
import { ProfileSettingsView } from './pages/ProfileSettingsView';
import { deletePhotoFromDrive } from './services/driveService';

// Default Sales ID for unified direct-access app
const SALES_USER_ID = 'sales_utama';

// Helper to recursively strip undefined values for Firestore
function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) return null as any;
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(sanitizeForFirestore) as any;
  }
  const clean: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean;
}

export default function App() {
  // App Navigation
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedMotor, setSelectedMotor] = useState<MotorItem | null>(null);
  const [initialMotorAdd, setInitialMotorAdd] = useState(false);
  const [initialCustomerAdd, setInitialCustomerAdd] = useState(false);

  // Data Collections
  const [motors, setMotors] = useState<MotorItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesProfile, setSalesProfile] = useState<SalesProfile | null>(null);

  // Listen directly to Firestore data (No login required)
  useEffect(() => {
    // 1. Listen to Motors collection
    const motorsQuery = query(collection(db, 'motors'));
    const unsubMotors = onSnapshot(
      motorsQuery,
      (snapshot) => {
        const loaded: MotorItem[] = [];
        snapshot.forEach((d) => {
          loaded.push({ id: d.id, ...d.data() } as MotorItem);
        });
        loaded.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setMotors(loaded);

        setSelectedMotor((currentSelected) => {
          if (!currentSelected) return null;
          return loaded.find((m) => m.id === currentSelected.id) || null;
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'motors');
      }
    );

    // 2. Listen to Customers collection
    const customersQuery = query(collection(db, 'customers'));
    const unsubCustomers = onSnapshot(
      customersQuery,
      (snapshot) => {
        const loaded: Customer[] = [];
        snapshot.forEach((d) => {
          loaded.push({ id: d.id, ...d.data() } as Customer);
        });
        loaded.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setCustomers(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'customers');
      }
    );

    // 3. Listen to Sales Profile
    const profileRef = doc(db, 'sales_profiles', SALES_USER_ID);
    const unsubProfile = onSnapshot(
      profileRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setSalesProfile(docSnap.data() as SalesProfile);
        } else {
          const defaultProfile: SalesProfile = {
            userId: SALES_USER_ID,
            name: 'Kang Jamhur Motor',
            phone: '081234567890',
            updatedAt: new Date().toISOString(),
          };
          setDoc(profileRef, defaultProfile).catch((e) =>
            console.warn('Initial profile creation:', e)
          );
          setSalesProfile(defaultProfile);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `sales_profiles/${SALES_USER_ID}`);
      }
    );

    return () => {
      unsubMotors();
      unsubCustomers();
      unsubProfile();
    };
  }, []);

  // Save / Update Motor
  const handleSaveMotor = async (
    motorData: Omit<MotorItem, 'id' | 'createdAt' | 'updatedAt'>,
    editId?: string
  ) => {
    const motorId = editId || `MTR_${Date.now()}`;
    const now = new Date().toISOString();

    const docRef = doc(db, 'motors', motorId);
    const fullPayload: MotorItem = {
      id: motorId,
      ...motorData,
      price: typeof motorData.price === 'number' ? motorData.price : 0,
      userEmail: motorData.userEmail || '',
      originalDescription: motorData.originalDescription || motorData.description,
      createdAt: editId ? (motorData as any).createdAt || now : now,
      updatedAt: now,
    };

    const cleanPayload = sanitizeForFirestore(fullPayload);

    try {
      await setDoc(docRef, cleanPayload);
      if (selectedMotor && selectedMotor.id === motorId) {
        setSelectedMotor(cleanPayload);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `motors/${motorId}`);
    }
  };

  // Delete Motor and Drive photos
  const handleDeleteMotor = async (motor: MotorItem) => {
    try {
      for (const photo of motor.photos) {
        try {
          await deletePhotoFromDrive(photo.fileId);
        } catch (photoErr) {
          console.warn(`Could not delete photo ${photo.fileId}:`, photoErr);
        }
      }

      await deleteDoc(doc(db, 'motors', motor.id));
      if (selectedMotor?.id === motor.id) {
        setSelectedMotor(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `motors/${motor.id}`);
    }
  };

  // Save Customer
  const handleSaveCustomer = async (
    customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>,
    editId?: string
  ) => {
    const customerId = editId || `CUST_${Date.now()}`;
    const now = new Date().toISOString();

    const docRef = doc(db, 'customers', customerId);
    const fullPayload: Customer = {
      id: customerId,
      ...customerData,
      notes: customerData.notes || '',
      createdAt: editId ? (customerData as any).createdAt || now : now,
      updatedAt: now,
    };

    const cleanPayload = sanitizeForFirestore(fullPayload);

    try {
      await setDoc(docRef, cleanPayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `customers/${customerId}`);
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async (customer: Customer) => {
    try {
      await deleteDoc(doc(db, 'customers', customer.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `customers/${customer.id}`);
    }
  };

  // Save Sales Profile
  const handleSaveProfile = async (updatedProfile: SalesProfile) => {
    try {
      await setDoc(doc(db, 'sales_profiles', SALES_USER_ID), updatedProfile);
      setSalesProfile(updatedProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `sales_profiles/${SALES_USER_ID}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center text-slate-900 font-sans antialiased selection:bg-orange-500 selection:text-white">
      {/* Mobile-first centered frame container (optimal on Android & desktop) */}
      <div className="w-full max-w-md min-h-screen bg-white shadow-xl flex flex-col relative">
        {/* Top Header */}
        <Header
          currentTab={activeTab}
          salesProfile={salesProfile}
          onOpenProfile={() => {
            setSelectedMotor(null);
            setActiveTab('profile');
          }}
        />

        {/* Lightweight PWA Installation Notification */}
        <PWAInstallBanner />

        {/* Main Content Area */}
        <main className="flex-1 p-3.5 overflow-y-auto">
          {selectedMotor ? (
            <MotorDetailView
              motor={selectedMotor}
              salesPhone={salesProfile?.phone}
              onBack={() => setSelectedMotor(null)}
              onEdit={() => {
                setActiveTab('motor');
              }}
              onDelete={handleDeleteMotor}
            />
          ) : activeTab === 'dashboard' ? (
            <DashboardView
              salesProfile={salesProfile}
              motors={motors}
              customers={customers}
              onSelectMotor={(m) => setSelectedMotor(m)}
              onViewAllMotors={() => {
                setInitialMotorAdd(false);
                setActiveTab('motor');
              }}
              onViewAllCustomers={() => {
                setInitialCustomerAdd(false);
                setActiveTab('customer');
              }}
            />
          ) : activeTab === 'motor' ? (
            <MotorView
              motors={motors}
              userId={SALES_USER_ID}
              onSaveMotor={handleSaveMotor}
              onDeleteMotor={handleDeleteMotor}
              onSelectMotor={(m) => setSelectedMotor(m)}
              initialAddMode={initialMotorAdd}
            />
          ) : activeTab === 'customer' ? (
            <CustomerView
              customers={customers}
              userId={SALES_USER_ID}
              onSaveCustomer={handleSaveCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              initialAddMode={initialCustomerAdd}
            />
          ) : (
            <ProfileSettingsView
              salesProfile={salesProfile}
              userId={SALES_USER_ID}
              onSaveProfile={handleSaveProfile}
            />
          )}
        </main>

        {/* Persistent Bottom Navigation (Hidden on Detail View for full focus) */}
        {!selectedMotor && (
          <BottomNav
            activeTab={activeTab}
            onChangeTab={(t) => {
              setSelectedMotor(null);
              if (t === 'motor') setInitialMotorAdd(false);
              if (t === 'customer') setInitialCustomerAdd(false);
              setActiveTab(t);
            }}
            motorCount={motors.length}
            customerCount={customers.length}
          />
        )}
      </div>
    </div>
  );
}
