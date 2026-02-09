import { useCallback, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../store';
import {
  selectAllVulnerabilities,
  selectFilteredVulnerabilities,
  selectSelectedVulnerability,
  selectVulnerabilitySummary,
  setFilter,
  Vulnerability,
} from '../store/vulnerabilitySlice';

export function useVulnerabilities() {
  const dispatch = useAppDispatch();

  const allVulnerabilities = useAppSelector(selectAllVulnerabilities);
  const filteredVulnerabilities = useAppSelector(selectFilteredVulnerabilities);
  const selectedVulnerability = useAppSelector(selectSelectedVulnerability);
  const summary = useAppSelector(selectVulnerabilitySummary);
  const loading = useAppSelector((state) => state.vulnerabilities.loading);
  const scanStatus = useAppSelector((state) => state.vulnerabilities.scanStatus);
  const scanProgress = useAppSelector((state) => state.vulnerabilities.scanProgress);
  const filter = useAppSelector((state) => state.vulnerabilities.filter);

  // Group vulnerabilities by file
  const vulnerabilitiesByFile = useMemo(() => {
    const grouped: Record<string, Vulnerability[]> = {};
    for (const vuln of filteredVulnerabilities) {
      const file = vuln.location.fileUri;
      if (!grouped[file]) {
        grouped[file] = [];
      }
      grouped[file].push(vuln);
    }
    return grouped;
  }, [filteredVulnerabilities]);

  // Group vulnerabilities by severity
  const vulnerabilitiesBySeverity = useMemo(() => {
    return {
      critical: filteredVulnerabilities.filter((v) => v.severity === 'critical'),
      high: filteredVulnerabilities.filter((v) => v.severity === 'high'),
      medium: filteredVulnerabilities.filter((v) => v.severity === 'medium'),
      low: filteredVulnerabilities.filter((v) => v.severity === 'low'),
      info: filteredVulnerabilities.filter((v) => v.severity === 'info'),
    };
  }, [filteredVulnerabilities]);

  // Update severity filter
  const setSeverityFilter = useCallback(
    (severity: string[]) => {
      dispatch(setFilter({ severity }));
    },
    [dispatch]
  );

  // Update status filter
  const setStatusFilter = useCallback(
    (status: string[]) => {
      dispatch(setFilter({ status }));
    },
    [dispatch]
  );

  // Toggle a severity in the filter
  const toggleSeverityFilter = useCallback(
    (severity: string) => {
      const newSeverity = filter.severity.includes(severity)
        ? filter.severity.filter((s) => s !== severity)
        : [...filter.severity, severity];
      dispatch(setFilter({ severity: newSeverity }));
    },
    [dispatch, filter.severity]
  );

  // Get filename from URI
  const getFileName = useCallback((fileUri: string) => {
    return fileUri.split('/').pop() || fileUri;
  }, []);

  return {
    allVulnerabilities,
    filteredVulnerabilities,
    selectedVulnerability,
    summary,
    loading,
    scanStatus,
    scanProgress,
    filter,
    vulnerabilitiesByFile,
    vulnerabilitiesBySeverity,
    setSeverityFilter,
    setStatusFilter,
    toggleSeverityFilter,
    getFileName,
  };
}
