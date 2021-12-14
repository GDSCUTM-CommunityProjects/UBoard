import React from 'react';
import LocationOn from '@mui/icons-material/LocationOn';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';

import GoogleMapReact, { Maps } from 'google-map-react';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';

function ClickMarker(props: { lat: number; lng: number }) {
  return (
    <>
      <IconButton
        onClick={() => {
          window.open(
            `https://www.google.com/maps/search/?api=1&query=${props.lat}%2C${props.lng}`,
            `_blank`
          );
        }}
      >
        <LocationOn fontSize='large' />
      </IconButton>
    </>
  );
}

export function LocationPickerMap(props: {
  setLocation: React.Dispatch<React.SetStateAction<google.maps.LatLng>>;
}) {
  const loadMap = (map: google.maps.Map, maps: typeof google.maps) => {
    // initial API load, marker is invisible until user autofills an address
    const marker = new maps.Marker({
      position: { lat: 0, lng: 0 },
      map,
      draggable: true,
    });

    marker.addListener('dragend', () => {
      // update position when marker released
    });
    marker.setVisible(false);

    const autocomplete = new google.maps.places.Autocomplete(
      document.getElementById('pac-input') as HTMLInputElement,
      {
        fields: ['formatted_address', 'geometry', 'name'],
        strictBounds: false,
        componentRestrictions: { country: 'ca' },
      }
    );

    // Bias the search for the area shown on the map (GTA by default)
    autocomplete.setBounds(
      new google.maps.LatLngBounds().extend(map.getCenter()!)
    );

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();

      if (!place.geometry || !place.geometry.location) {
        return;
      }
      props.setLocation(place.geometry.location);
      map.setCenter(place.geometry.location);
      map.setZoom(15);
      marker.setPosition(place.geometry.location);
      marker.setVisible(true);
    });
  };

  return (
    <Stack>
      <TextField id='pac-input' />
      <Paper
        elevation={5}
        style={{ height: '50vh', width: '25%' }}
        sx={{ mt: 2 }}
      >
        <GoogleMapReact
          bootstrapURLKeys={{ key: process.env.MAPS_API as string, libraries: ['places'] }}
          defaultCenter={{ lat: 43.59, lng: -79.65 }} // default to GTA
          defaultZoom={8}
          yesIWantToUseGoogleMapApiInternals
          onGoogleApiLoaded={({ map, maps }) => loadMap(map, maps)}
        />
      </Paper>
    </Stack>
  );
}

export function LocationMap(props: {
  visible: boolean;
  lat: number;
  lng: number;
}) {
  const center = {
    lat: props.lat,
    lng: props.lng,
  };
  // TODO: look into infoWindow
  const getOptions = (maps: Maps) => {
    return {
      mapTypeControl: true,
      streetViewControl: true,
      fullScreenControl: true,
      fullSCreenControlOptions: true,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'on' }],
        },
      ],
    };
  };

  return props.visible ? (
    <>
      <Paper
        elevation={5}
        style={{ height: '50vh', width: '75vh' }}
        sx={{ mt: 2 }}
      >
        <GoogleMapReact
          bootstrapURLKeys={{ key: process.env.MAPS_API as string }}
          defaultCenter={center}
          defaultZoom={15}
          options={getOptions}
          yesIWantToUseGoogleMapApiInternals
        >
          <ClickMarker lat={center.lat} lng={center.lng} />
        </GoogleMapReact>
      </Paper>
    </>
  ) : (
    <></>
  );
}
