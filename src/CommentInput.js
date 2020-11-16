import React, { useState } from 'react';
import firebase from 'firebase';
import PropTypes from 'prop-types';
import './css/CommentInput.css';

export default function CommentInput({ postID }) {
  const [comment, setComment] = useState({
    postid: '',
    text: '',
    author: '',
  });

  function addToFirebase() {
    firebase.firestore().collection('comments').add(comment);
  }

  return (
    <div className="commentInputContainer">
      <div>Write a Comment</div>
      <input placeholder="text" onChange={(e) => setComment({ ...comment, text: e.target.value, postid: postID })} />
      <input placeholder="author" onChange={(e) => setComment({ ...comment, author: e.target.value, postid: postID })} />
      <button
        type="button"
        onClick={() => addToFirebase()}
      >
        Submit

      </button>
    </div>
  );
}

CommentInput.defaultProps = {
  postID: '',
};

CommentInput.propTypes = {
  postID: PropTypes.string,
};
