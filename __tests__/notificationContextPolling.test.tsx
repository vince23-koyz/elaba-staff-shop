import React from 'react';
import renderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationProvider } from '../context/NotificationContext';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    multiRemove: jest.fn(),
  },
}));

jest.mock('../config/api', () => ({
  api: {
    get: jest.fn(),
    put: jest.fn(),
  },
  API_ENDPOINTS: {
    NOTIFICATIONS: {
      LIST: '/notifications',
      READ: (id: string) => `/notifications/${id}/read`,
      READ_ALL: '/notifications/read-all',
    },
    BOOKINGS: {
      BASE: '/bookings',
    },
  },
}));

jest.mock('../services/socketService', () => ({
  __esModule: true,
  default: {
    isConnected: jest.fn(() => false),
    connect: jest.fn(),
    onNewNotification: jest.fn(),
    offNewNotification: jest.fn(),
    onBookingUpdated: jest.fn(),
    offBookingUpdated: jest.fn(),
    onBookingDeleted: jest.fn(),
    offBookingDeleted: jest.fn(),
    disconnect: jest.fn(),
  },
}));

jest.mock('@react-native-firebase/messaging', () => () => ({
  getToken: jest.fn(),
  onTokenRefresh: jest.fn(() => jest.fn()),
}));

jest.mock('../services/notificationService', () => ({
  updateDeviceToken: jest.fn(),
  deleteDeviceToken: jest.fn(),
}));

describe('NotificationProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('starts only one notification polling interval after mount', async () => {
    const setIntervalMock = jest.spyOn(globalThis, 'setInterval');
    let component: renderer.ReactTestRenderer | undefined;

    await act(async () => {
      component = renderer.create(
        <NotificationProvider>
          <></>
        </NotificationProvider>
      );
    });

    expect(setIntervalMock).toHaveBeenCalledTimes(1);
    component?.unmount();
    setIntervalMock.mockRestore();
  });
});
