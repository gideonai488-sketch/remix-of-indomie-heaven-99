import Header from "@/components/Header";
import NetflixHero from "@/components/NetflixHero";
import PromoBanner from "@/components/PromoBanner";
import MenuSection from "@/components/MenuSection";
import CartDrawer from "@/components/CartDrawer";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background pb-16">
      <Header />
      <NetflixHero />
      <PromoBanner />
      <MenuSection />
      <Footer />
      <CartDrawer />
      <BottomNav />
    </div>
  );
};

export default Index;
