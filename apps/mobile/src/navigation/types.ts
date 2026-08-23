export type AuthStackParamList = {
  Login: undefined
  RoleSelect: { phone: string; otp: string }
  Main: undefined
}

export type RootStackParamList = {
  SearchTrucks: undefined
  TruckDetail: { id: string }
}
