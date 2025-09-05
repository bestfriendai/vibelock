// Firebase service layer for LockerRoom MVP
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  sendPasswordResetEmail
} from "firebase/auth";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  QueryDocumentSnapshot
} from "firebase/firestore";
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from "firebase/storage";
import { auth, db, storage } from "../config/firebase";
import { User, Review, ChatRoom, ChatMessage, Comment } from "../types";

// Authentication Services
export const firebaseAuth = {
  // Sign up with email and password
  signUp: async (email: string, password: string, displayName?: string): Promise<FirebaseUser> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile with display name if provided
      if (displayName) {
        await updateProfile(user, { displayName });
      }
      
      return user;
    } catch (error: any) {
      throw new Error(error.message || "Failed to create account");
    }
  },

  // Sign in with email and password
  signIn: async (email: string, password: string): Promise<FirebaseUser> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error: any) {
      throw new Error(error.message || "Failed to sign in");
    }
  },

  // Sign out
  signOut: async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error(error.message || "Failed to sign out");
    }
  },

  // Listen to auth state changes
  onAuthStateChanged: (callback: (user: FirebaseUser | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  // Send password reset email
  resetPassword: async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(error.message || "Failed to send password reset email");
    }
  },

  // Get current user
  getCurrentUser: (): FirebaseUser | null => {
    return auth.currentUser;
  }
};

// User Profile Services
export const firebaseUsers = {
  // Create user profile document
  createUserProfile: async (userId: string, userData: Partial<User>): Promise<void> => {
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      throw new Error(error.message || "Failed to create user profile");
    }
  },

  // Get user profile
  getUserProfile: async (userId: string): Promise<User | null> => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        return {
          ...data,
          id: userSnap.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as unknown as User;
      }
      
      return null;
    } catch (error: any) {
      throw new Error(error.message || "Failed to get user profile");
    }
  },

  // Update user profile
  updateUserProfile: async (userId: string, updates: Partial<User>): Promise<void> => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      throw new Error(error.message || "Failed to update user profile");
    }
  }
};

// Firestore Database Services
export const firebaseFirestore = {
  // Create a document
  createDocument: async (collectionName: string, docId: string, data: any): Promise<void> => {
    try {
      const docRef = doc(db, collectionName, docId);
      await setDoc(docRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      throw new Error(error.message || "Failed to create document");
    }
  },

  // Add a document (auto-generated ID)
  addDocument: async (collectionName: string, data: any): Promise<string> => {
    try {
      const collectionRef = collection(db, collectionName);
      const docRef = await addDoc(collectionRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error: any) {
      throw new Error(error.message || "Failed to add document");
    }
  },

  // Get a document
  getDocument: async (collectionName: string, docId: string): Promise<any | null> => {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      }
      
      return null;
    } catch (error: any) {
      throw new Error(error.message || "Failed to get document");
    }
  },

  // Update a document
  updateDocument: async (collectionName: string, docId: string, updates: any): Promise<void> => {
    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      throw new Error(error.message || "Failed to update document");
    }
  },

  // Delete a document
  deleteDocument: async (collectionName: string, docId: string): Promise<void> => {
    try {
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete document");
    }
  },

  // Get collection with query
  getCollection: async (
    collectionName: string, 
    queryConstraints?: any[]
  ): Promise<any[]> => {
    try {
      const collectionRef = collection(db, collectionName);
      let q = query(collectionRef);
      
      if (queryConstraints && queryConstraints.length > 0) {
        q = query(collectionRef, ...queryConstraints);
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      });
    } catch (error: any) {
      throw new Error(error.message || "Failed to get collection");
    }
  },

  // Listen to document changes
  onDocumentSnapshot: (
    collectionName: string, 
    docId: string, 
    callback: (data: any | null) => void
  ) => {
    const docRef = doc(db, collectionName, docId);
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      } else {
        callback(null);
      }
    });
  },

  // Listen to collection changes
  onCollectionSnapshot: (
    collectionName: string, 
    callback: (data: any[]) => void,
    queryConstraints?: any[]
  ) => {
    const collectionRef = collection(db, collectionName);
    let q = query(collectionRef);
    
    if (queryConstraints && queryConstraints.length > 0) {
      q = query(collectionRef, ...queryConstraints);
    }
    
    return onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          ...docData,
          id: doc.id,
          createdAt: docData.createdAt?.toDate() || new Date(),
          updatedAt: docData.updatedAt?.toDate() || new Date()
        };
      });
      callback(data);
    });
  }
};

// Firebase Storage Services
export const firebaseStorage = {
  // Upload file
  uploadFile: async (
    filePath: string, 
    file: Blob | Uint8Array | ArrayBuffer, 
    metadata?: any
  ): Promise<string> => {
    try {
      const storageRef = ref(storage, filePath);
      const snapshot = await uploadBytes(storageRef, file, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error: any) {
      throw new Error(error.message || "Failed to upload file");
    }
  },

  // Get download URL
  getDownloadURL: async (filePath: string): Promise<string> => {
    try {
      const storageRef = ref(storage, filePath);
      return await getDownloadURL(storageRef);
    } catch (error: any) {
      throw new Error(error.message || "Failed to get download URL");
    }
  },

  // Delete file
  deleteFile: async (filePath: string): Promise<void> => {
    try {
      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef);
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete file");
    }
  }
};

// Reviews Services
export const firebaseReviews = {
  // Create a review
createReview: async (reviewData: Omit<Review, "id" | "createdAt" | "updatedAt" | "authorId">): Promise<string> => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Must be signed in to create a review");
      const reviewsRef = collection(db, "reviews");
      const docRef = await addDoc(reviewsRef, {
        ...reviewData,
        authorId: uid,
        likeCount: (reviewData as any).likeCount ?? 0,
        dislikeCount: (reviewData as any).dislikeCount ?? 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error: any) {
      throw new Error(error.message || "Failed to create review");
    }
  },

  // Get reviews with pagination
  getReviews: async (
    limitCount: number = 20,
    lastDoc?: QueryDocumentSnapshot
  ): Promise<{ reviews: Review[], lastDoc: QueryDocumentSnapshot | null }> => {
    try {
      const reviewsRef = collection(db, "reviews");
      let q = query(
        reviewsRef,
        where("status", "==", "approved"),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );

      if (lastDoc) {
        q = query(
          reviewsRef,
          where("status", "==", "approved"),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(limitCount)
        );
      }

      const querySnapshot = await getDocs(q);
      const reviews = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Review;
      });

      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
      
      return { reviews, lastDoc: lastVisible };
    } catch (error: any) {
      throw new Error(error.message || "Failed to get reviews");
    }
  },

  // Update review
  updateReview: async (reviewId: string, updates: Partial<Review>): Promise<void> => {
    try {
      const reviewRef = doc(db, "reviews", reviewId);
      await updateDoc(reviewRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      throw new Error(error.message || "Failed to update review");
    }
  },

  // Listen to reviews changes
  onReviewsSnapshot: (callback: (reviews: Review[]) => void) => {
    const reviewsRef = collection(db, "reviews");
    const q = query(
      reviewsRef,
      where("status", "==", "approved"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const reviews = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Review;
      });
      callback(reviews);
    });
  }
};

// Chat Services
export const firebaseChat = {
  // Get chat rooms
  getChatRooms: async (): Promise<ChatRoom[]> => {
    try {
      const chatRoomsRef = collection(db, "chatRooms");
      const q = query(chatRoomsRef, where("isActive", "==", true), orderBy("lastActivity", "desc"));
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          lastActivity: data.lastActivity?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as ChatRoom;
      });
    } catch (error: any) {
      throw new Error(error.message || "Failed to get chat rooms");
    }
  },

  // Listen to chat messages
  onMessagesSnapshot: (chatRoomId: string, callback: (messages: ChatMessage[]) => void) => {
    const messagesRef = collection(db, "chatRooms", chatRoomId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));
    
    return onSnapshot(q, (querySnapshot) => {
      const messages = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          timestamp: data.timestamp?.toDate() || new Date()
        } as ChatMessage;
      });
      callback(messages);
    });
  },

// Send message
  sendMessage: async (chatRoomId: string, messageData: Omit<ChatMessage, "id" | "timestamp">): Promise<void> => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Must be signed in to send messages");
      const messagesRef = collection(db, "chatRooms", chatRoomId, "messages");
      await addDoc(messagesRef, {
        ...messageData,
        senderId: uid,
        timestamp: serverTimestamp()
      });

      // Update chat room last activity
      const chatRoomRef = doc(db, "chatRooms", chatRoomId);
      await updateDoc(chatRoomRef, {
        lastActivity: serverTimestamp(),
        lastMessage: {
          content: messageData.content,
          senderName: messageData.senderName,
          timestamp: serverTimestamp()
        }
      });
    } catch (error: any) {
      throw new Error(error.message || "Failed to send message");
    }
  }
};

// Comments Services
export const firebaseComments = {
  // Create a comment
  createComment: async (reviewId: string, commentData: Omit<Comment, "id" | "createdAt" | "updatedAt">): Promise<string> => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Must be signed in to comment");
      const commentsRef = collection(db, "reviews", reviewId, "comments");
      const docRef = await addDoc(commentsRef, {
        ...commentData,
        authorId: uid,
        likeCount: (commentData as any).likeCount ?? 0,
        dislikeCount: (commentData as any).dislikeCount ?? 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error: any) {
      throw new Error(error.message || "Failed to create comment");
    }
  },

  // Get comments for a review
  getComments: async (reviewId: string): Promise<Comment[]> => {
    try {
      const commentsRef = collection(db, "reviews", reviewId, "comments");
      const q = query(commentsRef, orderBy("createdAt", "asc"));
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Comment;
      });
    } catch (error: any) {
      throw new Error(error.message || "Failed to get comments");
    }
  },

  // Update comment (like/dislike)
  updateComment: async (reviewId: string, commentId: string, updates: Partial<Comment>): Promise<void> => {
    try {
      const commentRef = doc(db, "reviews", reviewId, "comments", commentId);
      await updateDoc(commentRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      throw new Error(error.message || "Failed to update comment");
    }
  },

  // Delete comment
  deleteComment: async (reviewId: string, commentId: string): Promise<void> => {
    try {
      const commentRef = doc(db, "reviews", reviewId, "comments", commentId);
      await deleteDoc(commentRef);
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete comment");
    }
  },

  // Listen to comments changes
  onCommentsSnapshot: (reviewId: string, callback: (comments: Comment[]) => void) => {
    const commentsRef = collection(db, "reviews", reviewId, "comments");
    const q = query(commentsRef, orderBy("createdAt", "asc"));
    
    return onSnapshot(q, (querySnapshot) => {
      const comments = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Comment;
      });
      callback(comments);
    });
  }
};

// Helper functions for Firestore queries
export const firestoreHelpers = {
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp
};
