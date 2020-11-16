import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import firebase from 'firebase';
import './css/Post.css';
import CommentInput from './CommentInput';
import Comment from './Comment';

export default function Post({
  title, body, author, date, docID,
}) {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    firebase.firestore().collection('comments').where('postid', '==', { docID }).get()
      .then((querySnapshot) => {
        setComments(querySnapshot.docs.map((doc) => doc.data()));
      });

    firebase.firestore().collection('comments').onSnapshot((querySnapshot) => {
      setComments(querySnapshot.docs.map((doc) => doc.data()));
    });
  }, []);

  return (
    <div className="postContainer">
      <div className="title">{title}</div>
      <div>{body}</div>
      <div>{author}</div>
      <div>{date}</div>

      <CommentInput postID={docID} />
      <div className="commentContainer">
        {comments.map((comment) => (
          <Comment
            author={`author: ${comment.author}`}
            text={comment.text}
          />
        ))}
      </div>
    </div>
  );
}

Post.defaultProps = {
  title: '',
  body: '',
  author: '',
  date: '',
  docID: '',
};

Post.propTypes = {
  title: PropTypes.string,
  body: PropTypes.string,
  author: PropTypes.string,
  date: PropTypes.string,
  docID: PropTypes.string,
};
