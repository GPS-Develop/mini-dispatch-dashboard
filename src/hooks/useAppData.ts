import { useLoads } from '../features/loads/LoadContext';
import { useDrivers } from '../features/drivers/DriverContext';
import { usePayStatements } from '../features/paystatements/PayStatementContext';
import { useUI } from '../contexts/UIContext';

/**
 * Combined hook that provides access to all main application data and UI state
 * Reduces prop drilling by providing a single point of access to common data
 */
export function useAppData() {
  const loadContext = useLoads();
  const driverContext = useDrivers();
  const payStatementContext = usePayStatements();
  const uiContext = useUI();

  // Helper function to get driver name by ID
  const getDriverName = (driverId: string) => {
    const driver = driverContext.drivers.find((d) => d.id === driverId);
    if (!driver) return "Unknown";
    if (driver.driver_status !== "active") {
      return `${driver.name} (${driver.driver_status.charAt(0).toUpperCase() + driver.driver_status.slice(1)})`;
    }
    return driver.name;
  };

  // Helper function to get active drivers only
  const getActiveDrivers = () => {
    return driverContext.drivers.filter(driver => driver.driver_status === 'active');
  };

  // Helper function to get loads by status
  const getLoadsByStatus = (status: string) => {
    if (status === 'All') return loadContext.loads;
    return loadContext.loads.filter(load => load.status === status);
  };

  // Helper function to get loads by driver
  const getLoadsByDriver = (driverId: string) => {
    return loadContext.loads.filter(load => load.driver_id === driverId);
  };

  // Combined loading state
  const isAnyLoading = loadContext.loading || driverContext.loading || payStatementContext.loading;

  // Combined error state
  const hasAnyError = Boolean(loadContext.error || driverContext.error || payStatementContext.error);

  return {
    // Data contexts
    loads: loadContext,
    drivers: driverContext,
    payStatements: payStatementContext,
    ui: uiContext,

    // Helper functions
    getDriverName,
    getActiveDrivers,
    getLoadsByStatus,
    getLoadsByDriver,

    // Combined states
    isAnyLoading,
    hasAnyError,

    // Common actions (aliases for easier access)
    setLoading: uiContext.setLoading,
    setError: uiContext.setError,
    clearError: uiContext.clearError,
    openModal: uiContext.openModal,
    closeModal: uiContext.closeModal,
    setSelected: uiContext.setSelected,
    getSelected: uiContext.getSelected,
    clearSelected: uiContext.clearSelected,
  };
}