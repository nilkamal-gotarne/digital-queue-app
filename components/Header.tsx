/* eslint-disable prettier/prettier */
import { View, Text, StyleSheet } from 'react-native';
import React from 'react';


const AppHeader = ({title}:any) => {
  return (
    <View style={styles.header}>
    <Text style={styles.headerText}>{title ? title : 'No Title'}</Text>
  </View>
  );
};

export default AppHeader;

const styles = StyleSheet.create({
    header: {
        paddingTop:55,
        backgroundColor: "#4287f5",
        padding: 15,
        paddingVertical:25,
        borderBottomRightRadius:30,
        borderBottomLeftRadius:30,
      },
      headerText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
      },
});