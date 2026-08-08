import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Location from 'expo-location'
import { api } from '../services/api'

interface Truck {
  id: string
  bodyType: string
  lengthFt: number
  heightFt: number
  tonnageCapacity: number
  distanceKm: number
  verificationStatus: string
}

export function SearchTrucksScreen({ navigation }: any) {
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [loading, setLoading] = useState(true)
  const [radius, setRadius] = useState(50)
  const [location, setLocation] = useState({ lat: 18.5204, lng: 73.8567 })

  useEffect(() => {
    getLocation()
  }, [])

  useEffect(() => {
    searchTrucks()
  }, [location, radius])

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({})
        setLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        })
      }
    } catch (e) {
      console.warn('Location permission error', e)
    }
  }

  const searchTrucks = async () => {
    setLoading(true)
    try {
      const res = await api.get('/search/trucks', {
        params: { lat: location.lat, lng: location.lng, radius },
      })
      setTrucks(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const renderTruck = ({ item }: { item: Truck }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>● {item.verificationStatus}</Text>
        </View>
        <Text style={styles.distance}>{item.distanceKm}km away</Text>
      </View>

      <Text style={styles.title}>{item.bodyType} Body Truck</Text>

      <View style={styles.specsRow}>
        <View style={styles.spec}>
          <Text style={styles.specLabel}>Capacity</Text>
          <Text style={styles.specValue}>{item.tonnageCapacity}T</Text>
        </View>
        <View style={styles.spec}>
          <Text style={styles.specLabel}>Length</Text>
          <Text style={styles.specValue}>{item.lengthFt}ft</Text>
        </View>
        <View style={styles.spec}>
          <Text style={styles.specLabel}>Height</Text>
          <Text style={styles.specValue}>{item.heightFt}ft</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('TruckDetail', { id: item.id })}
      >
        <Text style={styles.buttonText}>🔒 Reveal Contact Details</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.screenTitle}>Nearby Trucks ({radius}km)</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#F97316" style={styles.loader} />
      ) : (
        <FlatList
          data={trucks}
          keyExtractor={(item) => item.id}
          renderItem={renderTruck}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No trucks found in {radius}km radius.</Text>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  screenTitle: { fontSize: 22, fontWeight: 'bold', padding: 16, color: '#0F172A' },
  loader: { marginTop: 40 },
  list: { padding: 16, gap: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  badge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#166534', fontSize: 12, fontWeight: '600' },
  distance: { color: '#64748B', fontSize: 13 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 12 },
  specsRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 8, paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  spec: { alignItems: 'center' },
  specLabel: { fontSize: 12, color: '#64748B' },
  specValue: { fontSize: 15, fontWeight: 'bold', color: '#0F172A', marginTop: 2 },
  button: { backgroundColor: '#F97316', paddingVertical: 12, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#64748B' },
})
