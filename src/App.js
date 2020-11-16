import React, { useEffect, useState } from 'react';
import firebase from 'firebase';
import 'firebase/firestore';
import Post from './Post';
import PostInput from './PostInput';
import './App.css';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

function App() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    firebase.firestore().collection('posts').orderBy('date').get()
      .then((querySnapshot) => {
        setPosts(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      });

    firebase.firestore().collection('posts').orderBy('date').onSnapshot((querySnapshot) => {
      setPosts(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  return (
    <>
      {posts.map((post) => (
        <Post
          title={`title: ${post.title}`}
          body={`body: ${post.body}`}
          author={`author: ${post.author}`}
          date={`date: ${post.date}`}
          docID={post.id}
        />
      ))}
      <PostInput />
    </>
  );
}

export default App;
