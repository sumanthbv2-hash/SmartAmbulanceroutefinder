export enum AppView {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  MAP_NAVIGATION = 'MAP_NAVIGATION',
}

export enum MissionStatus {
  IDLE = 'IDLE',
  CALCULATING = 'CALCULATING',
  ENROUTE_PATIENT = 'ENROUTE_PATIENT',
  AT_PATIENT = 'AT_PATIENT',
  ENROUTE_HOSPITAL = 'ENROUTE_HOSPITAL',
  COMPLETED = 'COMPLETED',
}

export enum TrafficLightState {
  RED = 'RED',
  YELLOW = 'YELLOW',
  GREEN = 'GREEN',
  GREEN_CORRIDOR_ACTIVE = 'GREEN_CORRIDOR_ACTIVE',
}

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface EmergencyDetails {
  type: string;
  severity: 'Low' | 'Medium' | 'Critical';
  patientName: string;
  description: string;
}

export interface AILog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'analysis';
}
