import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// Removed socket.io-client in favour of HTTP polling

// You should replace these with your Render deployment URLs.
// When running locally use "http://localhost:4000/api" and "http://localhost:4000"
const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:4000/api';
// We no longer use WebSockets; chat uses HTTP polling

/* -------------------------------------------------------------------------- */
/*                              Events Screen                                 */
/* -------------------------------------------------------------------------- */
function EventsScreen() {
  const [events, setEvents] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API_BASE}/events`);
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const addEvent = async () => {
    if (!name) return;
    try {
      const res = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      const newEvent = await res.json();
      setEvents([newEvent, ...events]);
      setName('');
      setDescription('');
    } catch (err) {
      console.error('Failed to create event:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Events</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Event Name"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
        />
        <Button title="Add Event" onPress={addEvent} />
      </View>
      <FlatList
        data={events}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text style={styles.listItemTitle}>{item.name}</Text>
            {item.description ? (
              <Text style={styles.listItemSubtitle}>{item.description}</Text>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Swipe Screen                                  */
/* -------------------------------------------------------------------------- */
// Very basic swipe screen; in a real app you would implement swipe cards
function SwipeScreen() {
  const [users, setUsers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleLike = () => {
    setCurrentIndex((prev) => (prev + 1) % users.length);
  };

  const handleSkip = () => {
    setCurrentIndex((prev) => (prev + 1) % users.length);
  };

  if (users.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Swipe</Text>
        <Text>No users available. Add some users via the API.</Text>
      </View>
    );
  }

  const user = users[currentIndex];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Swipe</Text>
      <View style={styles.card}>
        <Text style={styles.cardName}>{user.name}</Text>
        {user.bio ? <Text style={styles.cardBio}>{user.bio}</Text> : null}
      </View>
      <View style={styles.buttonRow}>
        <Button title="Skip" onPress={handleSkip} />
        <Button title="Like" onPress={handleLike} />
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Chat screens                                 */
/* -------------------------------------------------------------------------- */
function EventsListScreen({ navigation }) {
  const [events, setEvents] = useState([]);

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API_BASE}/events`);
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchEvents();
    });
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Chats</Text>
      <FlatList
        data={events}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('ChatRoom', { eventId: item._id, eventName: item.name })
            }
            style={styles.listItem}
          >
            <Text style={styles.listItemTitle}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function ChatRoomScreen({ route }) {
  const { eventId, eventName } = route.params;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const userIdRef = useRef(null);

  // Create a random user when the chat starts
  const createAnonUser = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Anon ' + Math.floor(Math.random() * 1000) }),
      });
      const user = await res.json();
      userIdRef.current = user._id;
    } catch (err) {
      console.error('Failed to create anon user:', err);
    }
  };

  // Fetch messages from the server
  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_BASE}/messages/${eventId}`);
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  useEffect(() => {
    createAnonUser();
    fetchMessages();
    // Poll for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    return () => {
      clearInterval(interval);
    };
  }, [eventId]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, userId: userIdRef.current, text: input }),
      });
      const newMessage = await res.json();
      setMessages((prev) => [...prev, newMessage]);
      setInput('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <Text style={styles.header}>{eventName}</Text>
      <FlatList
        data={messages}
        keyExtractor={(item, index) => item._id || index.toString()}
        renderItem={({ item }) => (
          <View style={styles.messageItem}>
            <Text style={styles.messageSender}>{item.sender?.name || 'Anon'}</Text>
            <Text>{item.text}</Text>
          </View>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.messageInput}
          placeholder="Type your message..."
          value={input}
          onChangeText={setInput}
        />
        <Button title="Send" onPress={sendMessage} />
      </View>
    </KeyboardAvoidingView>
  );
}

const ChatStack = createNativeStackNavigator();

function ChatsTab() {
  return (
    <ChatStack.Navigator>
      <ChatStack.Screen name="EventsList" component={EventsListScreen} options={{ title: 'Events' }} />
      <ChatStack.Screen name="ChatRoom" component={ChatRoomScreen} options={({ route }) => ({ title: route.params.eventName })} />
    </ChatStack.Navigator>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Profile Screen                                */
/* -------------------------------------------------------------------------- */
function ProfileScreen() {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Profile</Text>
      <TextInput
        style={styles.input}
        placeholder="Your name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Bio / Prompt"
        value={bio}
        onChangeText={setBio}
      />
      <Text>Feature to upload photos coming soon.</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                           Main App Navigation                              */
/* -------------------------------------------------------------------------- */
const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Events" component={EventsScreen} />
        <Tab.Screen name="Swipe" component={SwipeScreen} />
        <Tab.Screen name="Chats" component={ChatsTab} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Styles                                     */
/* -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  listItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  listItemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  card: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  cardName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardBio: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  messageItem: {
    paddingVertical: 6,
  },
  messageSender: {
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 8,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginRight: 8,
  },
});