import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface Blog {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  slug: string;
  logoUrl?: string;
  footerText?: string;
  categories: string[];
  styling: BlogStyling;
  createdAt: any;
  updatedAt: any;
}

export interface BlogStyling {
  primaryColor: string;
  backgroundColor: string;
  cardColor: string;
  textColor: string;
  fontFamily: string;
  layout: 'grid' | 'list';
}

export interface BlogPost {
  id: string;
  blogId: string;
  companyId: string;
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  authorId: string;
  authorName: string;
  coverImage?: string;
  status: 'draft' | 'published';
  tags: string[];
  category?: string;
  publishedAt?: any;
  createdAt: any;
  updatedAt: any;
}

export interface BlogComment {
  id: string;
  blogId: string;
  postId: string;
  companyId: string;
  authorName: string;
  authorEmail: string;
  content: string;
  status: 'pending' | 'approved' | 'spam';
  createdAt: any;
}

export interface MediaAsset {
  id: string;
  companyId: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'document';
  size: number;
  dimensions?: { width: number; height: number };
  tags: string[];
  uploadedBy: string;
  createdAt: any;
}

export interface BlogAnalyticsEvent {
  id: string;
  blogId: string;
  postId?: string;
  companyId: string;
  eventType: 'view' | 'engagement' | 'read_time';
  source?: string;
  value?: number;
  userAgent?: string;
  createdAt: any;
}

export const blogService = {
  // Blogs
  async getBlogs(companyId: string) {
    const q = query(collection(db, 'blogs'), where('companyId', '==', companyId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Blog));
  },

  async getBlogBySlug(slug: string) {
    const q = query(collection(db, 'blogs'), where('slug', '==', slug));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Blog;
  },

  async createBlog(data: Partial<Blog>) {
    return addDoc(collection(db, 'blogs'), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  },

  async updateBlog(id: string, data: Partial<Blog>) {
    return updateDoc(doc(db, 'blogs', id), {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  async deleteBlog(id: string) {
    return deleteDoc(doc(db, 'blogs', id));
  },

  // Posts
  async getPosts(blogId: string, status?: 'draft' | 'published') {
    let q = query(collection(db, 'blogPosts'), where('blogId', '==', blogId), orderBy('createdAt', 'desc'));
    if (status) {
      q = query(collection(db, 'blogPosts'), where('blogId', '==', blogId), where('status', '==', status), orderBy('createdAt', 'desc'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
  },

  async getPostBySlug(blogId: string, slug: string) {
    const q = query(collection(db, 'blogPosts'), where('blogId', '==', blogId), where('slug', '==', slug));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as BlogPost;
  },

  async createPost(data: Partial<BlogPost>) {
    const user = auth.currentUser;
    return addDoc(collection(db, 'blogPosts'), {
      ...data,
      authorId: user?.uid,
      authorName: user?.displayName || 'Anonymous',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      publishedAt: data.status === 'published' ? serverTimestamp() : null
    });
  },

  async updatePost(id: string, data: Partial<BlogPost>) {
    const updateData: any = {
      ...data,
      updatedAt: serverTimestamp()
    };
    if (data.status === 'published' && !data.publishedAt) {
      updateData.publishedAt = serverTimestamp();
    }
    return updateDoc(doc(db, 'blogPosts', id), updateData);
  },

  async deletePost(id: string) {
    return deleteDoc(doc(db, 'blogPosts', id));
  },

  // Analytics
  async logEvent(data: { blogId: string, companyId: string, eventType: 'view' | 'engagement' | 'read_time', postId?: string, source?: string, value?: number }) {
    return addDoc(collection(db, 'blogAnalyticsEvents'), {
      ...data,
      userAgent: navigator.userAgent,
      createdAt: serverTimestamp()
    });
  },

  async getAnalytics(blogId: string, days: number = 30) {
    const q = query(
      collection(db, 'blogAnalyticsEvents'), 
      where('blogId', '==', blogId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogAnalyticsEvent));
  },

  // Comments
  async getComments(postId: string, status?: 'pending' | 'approved' | 'spam') {
    let q = query(collection(db, 'blogComments'), where('postId', '==', postId), orderBy('createdAt', 'desc'));
    if (status) {
      q = query(collection(db, 'blogComments'), where('postId', '==', postId), where('status', '==', status), orderBy('createdAt', 'desc'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogComment));
  },

  async createComment(data: Partial<BlogComment>) {
    return addDoc(collection(db, 'blogComments'), {
      ...data,
      status: 'pending',
      createdAt: serverTimestamp()
    });
  },

  async updateCommentStatus(commentId: string, status: 'pending' | 'approved' | 'spam') {
    return updateDoc(doc(db, 'blogComments', commentId), { status });
  },

  async deleteComment(commentId: string) {
    return deleteDoc(doc(db, 'blogComments', commentId));
  },

  // Media
  async getMedia(companyId: string, type?: 'image' | 'video' | 'document') {
    let q = query(collection(db, 'mediaAssets'), where('companyId', '==', companyId), orderBy('createdAt', 'desc'));
    if (type) {
      q = query(collection(db, 'mediaAssets'), where('companyId', '==', companyId), where('type', '==', type), orderBy('createdAt', 'desc'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MediaAsset));
  },

  async addMedia(data: Partial<MediaAsset>) {
    return addDoc(collection(db, 'mediaAssets'), {
      ...data,
      uploadedBy: auth.currentUser?.uid,
      createdAt: serverTimestamp()
    });
  },

  async deleteMedia(assetId: string) {
    return deleteDoc(doc(db, 'mediaAssets', assetId));
  }
};
