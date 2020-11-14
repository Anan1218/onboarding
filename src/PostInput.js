import React, { useState, useEffect, useRef } from 'react';
import firebase from 'firebase';

export default function PostInput() {
  const [post, setPost] = useState({
    title: '',
    body: '',
    author: '',
    date: '',
  });

  // checks when asynchronous setPost function updates the value of date
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) {
      firebase.firestore().collection('posts').add(post);
    } else {
      loaded.current = true;
    }
  }, [post.date]);

  function addDate() {
    const currentDate = new Date().toLocaleDateString();
    setPost(() => ({
      ...post,
      date: currentDate,
    }));
  }

  return (
    <>
      <input onChange={(e) => setPost({ ...post, title: e.target.value })} />
      <input onChange={(e) => setPost({ ...post, body: e.target.value })} />
      <input onChange={(e) => setPost({ ...post, author: e.target.value })} />
      <button
        type="button"
        onClick={() => addDate()}
      >
        Submit

      </button>
    </>
  );
}
