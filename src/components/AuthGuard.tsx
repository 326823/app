import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * AuthGuard - 路由鉴权组件
 * 拦截未登录请求并重定向至登录页
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('isLoggedIn');
  
  if (!token) {
    // replace: true 确保用户点击返回不会回到拦截点
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}
