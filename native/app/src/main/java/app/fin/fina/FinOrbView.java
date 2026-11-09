package app.fin.fina;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.view.View;
import java.util.Random;
import java.util.Arrays;

/** Native reactive spatial sculpture, independent of WebView. */
public final class FinOrbView extends View {
  public enum Mood { IDLE, LISTENING, THINKING, SPEAKING, SUCCESS }
  private final Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);
  private final float[][] points=new float[320][4];
  private final int[] order=new int[320];
  private final RectF oval=new RectF();
  private Mood mood=Mood.IDLE;
  private float rotation=0f,phase=0f,energy=0f;
  private boolean active=false;
  private long previous=0;
  private final int clear=Color.rgb(12,17,24),accent=Color.rgb(146,197,189);
  public FinOrbView(Context context){
    super(context);setLayerType(View.LAYER_TYPE_SOFTWARE,null);
    Random r=new Random(20261109);
    for(int i=0;i<points.length;i++){
      // Evenly distributed points on a sphere, with a slight orbit disturbance.
      double y=1-2*(i+0.5)/points.length;
      double radius=Math.sqrt(1-y*y);
      double a=i*2.399963229728653;
      points[i][0]=(float)(Math.cos(a)*radius);
      points[i][1]=(float)y;
      points[i][2]=(float)(Math.sin(a)*radius);
      points[i][3]=0.48f+r.nextFloat()*0.52f;
      order[i]=i;
    }
  }
  public void setMood(Mood next){mood=next;invalidate();}
  public void resume(){active=true;previous=0;postInvalidateOnAnimation();}
  public void pause(){active=false;previous=0;}
  public void setEnergy(float level){energy=Math.max(0,Math.min(1,level));invalidate();}
  @Override protected void onAttachedToWindow(){super.onAttachedToWindow();resume();}
  @Override protected void onDetachedFromWindow(){pause();super.onDetachedFromWindow();}
  private int blend(int a,int b,float t){t=Math.max(0,Math.min(1,t));return Color.rgb(
      (int)(Color.red(a)*(1-t)+Color.red(b)*t),
      (int)(Color.green(a)*(1-t)+Color.green(b)*t),
      (int)(Color.blue(a)*(1-t)+Color.blue(b)*t));}
  @Override protected void onDraw(Canvas c){
    super.onDraw(c);
    long now=System.nanoTime();float dt=previous==0?0.016f:Math.min(0.05f,(now-previous)/1000000000f);previous=now;
    if(active){rotation+=dt*(mood==Mood.THINKING?0.65f:0.22f);phase+=dt;}
    float w=getWidth(),h=getHeight(),cx=w/2,cy=h/2;
    float r=Math.min(w,h)*0.265f;
    int focus=mood==Mood.LISTENING?Color.rgb(112,192,209):mood==Mood.THINKING?Color.rgb(180,161,213):mood==Mood.SUCCESS?Color.rgb(165,207,163):accent;
    float pulse=1+0.04f*(float)Math.sin(phase*1.6f)+(mood==Mood.LISTENING?energy*.09f:0);
    float R=r*pulse;
    // Glow contained inside bounds.
    p.setStyle(Paint.Style.FILL);p.setShader(new RadialGradient(cx,cy,R*1.9f,
        new int[]{Color.argb(42,Color.red(focus),Color.green(focus),Color.blue(focus)),Color.argb(12,Color.red(focus),Color.green(focus),Color.blue(focus)),Color.TRANSPARENT},
        new float[]{0f,.5f,1f},Shader.TileMode.CLAMP));
    c.drawCircle(cx,cy,R*1.9f,p);p.setShader(null);
    // Dark iridescent body.
    p.setShader(new RadialGradient(cx-R*.35f,cy-R*.4f,R*1.85f,
        new int[]{Color.rgb(59,88,100),Color.rgb(28,43,59),Color.rgb(10,17,27),Color.rgb(4,8,15)},
        new float[]{0,.28f,.68f,1},Shader.TileMode.CLAMP));
    c.drawCircle(cx,cy,R*.91f,p);p.setShader(null);
    // Depth sorted particles.
    float[] depth=new float[points.length];
    float sin=(float)Math.sin(rotation),cos=(float)Math.cos(rotation);
    float tilt=(float)Math.sin(rotation*.41f)*.27f,st=(float)Math.sin(tilt),ct=(float)Math.cos(tilt);
    for(int i=0;i<points.length;i++){
       float x=points[i][0],y=points[i][1],z=points[i][2];
       float rx=x*cos-z*sin,rz=x*sin+z*cos,ry=y*ct-rz*st;
       rz=y*st+rz*ct;
       depth[i]=rz;
       points[i][3]=points[i][3]; // static intrinsic brightness
    }
    Integer[] sorted=new Integer[points.length];for(int i=0;i<sorted.length;i++)sorted[i]=i;
    Arrays.sort(sorted,(a,b)->Float.compare(depth[a],depth[b]));
    for(int idx:sorted){
      float x=points[idx][0],y=points[idx][1],z=points[idx][2];
      float rx=x*cos-z*sin,rz=x*sin+z*cos,ry=y*ct-rz*st;
      rz=y*st+rz*ct;
      float perspective=2.9f/(2.9f-rz*.32f);
      float px=cx+rx*R*.93f*perspective,py=cy+ry*R*.93f*perspective;
      float f=(rz+1)*.5f;
      float brightness=(.25f+f*.75f)*points[idx][3];
      p.setColor(Color.argb((int)(80+155*brightness),
        (int)(Color.red(focus)*(.45f+.55f*f)),
        (int)(Color.green(focus)*(.45f+.55f*f)),
        (int)(Color.blue(focus)*(.45f+.55f*f))));
      c.drawCircle(px,py,(0.7f+1.6f*f)*getResources().getDisplayMetrics().density*.65f,p);
    }
    // Fine orbital tracks, flowing above and behind core.
    p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(Math.max(1f,r*.006f));
    for(int k=0;k<3;k++){
      float theta=rotation*(k==1?-0.65f:0.6f)+k*1.07f;
      float squash=.25f+.18f*(float)Math.abs(Math.sin(theta));
      float skew=(float)Math.sin(theta)*R*.1f;
      c.save();c.rotate((k-1)*51+rotation*12,cx,cy);
      oval.set(cx-R*1.19f,cy-R*squash+skew,cx+R*1.19f,cy+R*squash+skew);
      p.setColor(Color.argb(55+k*7,Color.red(focus),Color.green(focus),Color.blue(focus)));
      c.drawOval(oval,p);c.restore();
    }
    p.setStyle(Paint.Style.FILL);
    // Highlight glancing off the upper left.
    p.setShader(new RadialGradient(cx-R*.36f,cy-R*.49f,R*.53f,
        new int[]{Color.argb(59,211,250,244),Color.argb(8,211,250,244),Color.TRANSPARENT},
        new float[]{0,.55f,1},Shader.TileMode.CLAMP));
    c.drawCircle(cx-R*.36f,cy-R*.49f,R*.53f,p);p.setShader(null);
    if(mood==Mood.LISTENING||mood==Mood.SPEAKING){
      float wave=(float)Math.sin(phase*5f)*.5f+.5f;
      p.setStyle(Paint.Style.STROKE);
      p.setStrokeWidth(Math.max(1.5f,R*.012f));
      p.setColor(Color.argb((int)(100+wave*65),Color.red(focus),Color.green(focus),Color.blue(focus)));
      c.drawCircle(cx,cy,R*(1.13f+energy*.09f+wave*.025f),p);
      p.setStyle(Paint.Style.FILL);
    }
    if(active)postInvalidateOnAnimation();
  }
}
