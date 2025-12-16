import { AbsoluteFill } from "remotion";

interface LayoutProps {
  children: React.ReactNode;
  imageUrl?: string;
  backgroundColor?: string;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  imageUrl = "https://via.placeholder.com/800x1200/333/fff?text=Device+Image",
  backgroundColor = "#0a0a0a"
}) => {
  return (
    <AbsoluteFill
      style={{
        padding: "80px 60px",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor,
        gap: 60,
      }}
    >
      {/* Text Content - Better responsive sizing */}
      <div style={{ 
        width: "60%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        height: "100%",
        padding: "40px 0"
      }}>
        {children}
      </div>

      {/* Image - Better aspect ratio handling */}
      <div style={{ 
        width: "35%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%"
      }}>
        <img
          src={imageUrl}
          style={{
            width: "100%",
            height: "auto",
            maxHeight: "85%",
            objectFit: "contain",
            borderRadius: 24,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export default Layout;