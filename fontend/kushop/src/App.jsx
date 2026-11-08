import React from 'react'
import { Routes, Route } from 'react-router-dom'
import MainMenu from './components/MainMenu.jsx'
import TheProduct from './components/TheProduct.jsx'
import TheLogin from './components/TheLogin.jsx'
import TheRegister from './components/TheRegister.jsx'
import PageMember from './components/PageMember.jsx'
import ProductShow from './components/ProductShow.jsx'
import CartShow from './components/CartShow.jsx'
import CartList from './components/CartList.jsx'
import ListMemberShow from './components/ListMemberShow.jsx'
import AddProduct from './components/AddProduct.jsx'
import EditProducts from './components/EditProducts.jsx'
import ChatbotWidget from './components/ChatbotWidget.jsx'

export default function App(){return <><MainMenu/><Routes>
  <Route path="/" element={<TheProduct/>}/><Route path="/login" element={<TheLogin/>}/><Route path="/register" element={<TheRegister/>}/>
  <Route path="/pagemember" element={<PageMember/>}/><Route path="/ProductShow/:pdId" element={<ProductShow/>}/>
  <Route path="/cartShow/:cartId" element={<CartShow/>}/><Route path="/cartList" element={<CartList/>}/>
  <Route path="/admin/members" element={<ListMemberShow/>}/><Route path="/admin/products" element={<TheProduct/>}/>
  <Route path="/admin/editproducts" element={<EditProducts/>}/>
  <Route path="/admin/orders" element={<CartList/>}/><Route path="/admin/addproducts" element={<AddProduct/>}/>
  <Route path="*" element={<div className="container py-5"><h2>ไม่พบหน้าที่ต้องการ</h2></div>}/>
</Routes><ChatbotWidget/></>}
