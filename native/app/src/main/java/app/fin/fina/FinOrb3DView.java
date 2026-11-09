package app.fin.fina;

import android.content.Context;
import android.opengl.GLES20;
import android.opengl.GLSurfaceView;
import android.opengl.Matrix;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;
import java.nio.ShortBuffer;
import java.util.Random;
import javax.microedition.khronos.egl.EGLConfig;
import javax.microedition.khronos.opengles.GL10;

/** Actual GPU-rendered 3D visual identity for FINA, with native GLES 2.0 shaders. */
public final class FinOrb3DView extends GLSurfaceView {
  private final Sculpture scene;
  public FinOrb3DView(Context c){
    super(c);
    setEGLContextClientVersion(2);
    setPreserveEGLContextOnPause(true);
    scene=new Sculpture();
    setRenderer(scene);
    setRenderMode(GLSurfaceView.RENDERMODE_CONTINUOUSLY);
  }
  public void setMood(FinOrbView.Mood mood){scene.mood=mood;}
  public void setEnergy(float level){scene.energy=Math.max(0f,Math.min(1f,level));}
  private static final class Sculpture implements Renderer {
    volatile FinOrbView.Mood mood=FinOrbView.Mood.IDLE;
    volatile float energy=0f;
    int sphereProgram,particleProgram,lineProgram;
    FloatBuffer sphereVertices,particles,rings;ShortBuffer sphereIndices;
    int sphereCount,particleCount;
    float time=0,previous=0;
    long last=0;
    final float[] proj=new float[16],view=new float[16],model=new float[16],vp=new float[16],mvp=new float[16];
    final float[] accent={.51f,.79f,.72f};
    private FloatBuffer floats(float[] f){ByteBuffer b=ByteBuffer.allocateDirect(f.length*4).order(ByteOrder.nativeOrder());FloatBuffer x=b.asFloatBuffer();x.put(f).position(0);return x;}
    private ShortBuffer shorts(short[] f){ByteBuffer b=ByteBuffer.allocateDirect(f.length*2).order(ByteOrder.nativeOrder());ShortBuffer x=b.asShortBuffer();x.put(f).position(0);return x;}
    private static final String SPHERE_V=
      "attribute vec3 aPos;attribute vec3 aNor;uniform mat4 uMVP;uniform mat4 uModel;varying vec3 vNor;varying vec3 vEye;"+
      "void main(){vec4 wp=uModel*vec4(aPos,1.0);vNor=normalize(mat3(uModel)*aNor);vEye=normalize(vec3(0.0,0.0,3.6)-wp.xyz);gl_Position=uMVP*vec4(aPos,1.0);}";
    private static final String SPHERE_F=
      "precision mediump float;varying vec3 vNor;varying vec3 vEye;uniform vec3 uAccent;uniform float uTime;"+
      "void main(){vec3 n=normalize(vNor);float d=max(dot(n,normalize(vec3(-0.5,0.8,1.0))),0.0);"+
      "float fres=pow(1.0-max(dot(n,normalize(vEye)),0.0),3.2);"+
      "float filament=pow(max(sin(n.y*75.0+n.x*33.0+uTime*1.8),0.0),11.0);"+
      "vec3 base=vec3(.022,.042,.072)+uAccent*(.085+d*.24)+uAccent*fres*.53;"+
      "base+=uAccent*filament*.09;gl_FragColor=vec4(base,1.0);}";
    private static final String PARTICLE_V=
      "attribute vec3 aPos;uniform mat4 uMVP;uniform float uTime;varying float vAlpha;"+
      "void main(){vec3 p=aPos;p.y+=sin(uTime*.8+p.x*8.0)*.026;"+
      "gl_Position=uMVP*vec4(p,1.0);gl_PointSize=3.5+2.0*(p.z+1.3)/2.6;vAlpha=.32+.35*(p.z+1.3)/2.6;}";
    private static final String PARTICLE_F=
      "precision mediump float;uniform vec3 uAccent;varying float vAlpha;"+
      "void main(){float r=length(gl_PointCoord-vec2(.5));float a=(1.0-smoothstep(.08,.49,r))*vAlpha;gl_FragColor=vec4(uAccent*a,a);}";
    private static final String LINE_V=
      "attribute vec3 aPos;uniform mat4 uMVP;void main(){gl_Position=uMVP*vec4(aPos,1.0);}";
    private static final String LINE_F=
      "precision mediump float;uniform vec3 uAccent;void main(){gl_FragColor=vec4(uAccent,.24);}";
    private int shader(int type,String src){
      int s=GLES20.glCreateShader(type);GLES20.glShaderSource(s,src);GLES20.glCompileShader(s);
      int[] status={0};GLES20.glGetShaderiv(s,GLES20.GL_COMPILE_STATUS,status,0);
      if(status[0]==0)throw new IllegalStateException("OpenGL shader: "+GLES20.glGetShaderInfoLog(s));
      return s;
    }
    private int program(String vert,String frag){
      int v=shader(GLES20.GL_VERTEX_SHADER,vert),f=shader(GLES20.GL_FRAGMENT_SHADER,frag);
      int p=GLES20.glCreateProgram();GLES20.glAttachShader(p,v);GLES20.glAttachShader(p,f);GLES20.glLinkProgram(p);
      int[] status={0};GLES20.glGetProgramiv(p,GLES20.GL_LINK_STATUS,status,0);
      if(status[0]==0)throw new IllegalStateException("OpenGL link: "+GLES20.glGetProgramInfoLog(p));
      GLES20.glDeleteShader(v);GLES20.glDeleteShader(f);return p;
    }
    private void geometry(){
      int lat=36,lon=72;
      float[] v=new float[(lat+1)*(lon+1)*6];int vi=0;
      for(int j=0;j<=lat;j++){
        double theta=Math.PI*j/lat;
        for(int i=0;i<=lon;i++){
          double phi=Math.PI*2*i/lon;
          float x=(float)(Math.sin(theta)*Math.cos(phi)),y=(float)Math.cos(theta),z=(float)(Math.sin(theta)*Math.sin(phi));
          v[vi++]=x*.82f;v[vi++]=y*.82f;v[vi++]=z*.82f;
          v[vi++]=x;v[vi++]=y;v[vi++]=z;
        }
      }
      short[] ids=new short[lat*lon*6];int at=0;
      for(int j=0;j<lat;j++)for(int i=0;i<lon;i++){
        int a=j*(lon+1)+i,b=a+lon+1;
        ids[at++]=(short)a;ids[at++]=(short)b;ids[at++]=(short)(a+1);
        ids[at++]=(short)(a+1);ids[at++]=(short)b;ids[at++]=(short)(b+1);
      }
      sphereVertices=floats(v);sphereIndices=shorts(ids);sphereCount=ids.length;
      int count=720;float[] dots=new float[count*3];
      for(int i=0;i<count;i++){
        float y=(float)(1.0-2.0*(i+.5)/count),r=(float)Math.sqrt(1-y*y),theta=(float)(i*2.39996323);
        float radius=1.03f+.23f*(float)Math.sin(i*.67f);
        dots[i*3]=radius*r*(float)Math.cos(theta);
        dots[i*3+1]=radius*y;
        dots[i*3+2]=radius*r*(float)Math.sin(theta);
      }
      particles=floats(dots);particleCount=count;
      int segments=240;float[] circle=new float[segments*3];
      for(int i=0;i<segments;i++){
        double a=i*2.0*Math.PI/(segments-1);
        circle[i*3]=1.18f*(float)Math.cos(a);
        circle[i*3+1]=.34f*(float)Math.sin(a);
        circle[i*3+2]=0f;
      }
      rings=floats(circle);
    }
    @Override public void onSurfaceCreated(GL10 gl,EGLConfig config){
      GLES20.glClearColor(.085f,.119f,.15f,1f);
      GLES20.glEnable(GLES20.GL_DEPTH_TEST);
      GLES20.glEnable(GLES20.GL_BLEND);
      GLES20.glBlendFunc(GLES20.GL_SRC_ALPHA,GLES20.GL_ONE_MINUS_SRC_ALPHA);
      sphereProgram=program(SPHERE_V,SPHERE_F);
      particleProgram=program(PARTICLE_V,PARTICLE_F);
      lineProgram=program(LINE_V,LINE_F);
      geometry();last=0;
    }
    @Override public void onSurfaceChanged(GL10 gl,int w,int h){
      GLES20.glViewport(0,0,w,h);
      Matrix.perspectiveM(proj,0,40f,(float)w/Math.max(1,h),.1f,100f);
      Matrix.setLookAtM(view,0,0,0,4.0f,0,0,0,0,1,0);
      Matrix.multiplyMM(vp,0,proj,0,view,0);
    }
    private void moodColors(){
      switch(mood){
        case LISTENING:accent[0]=.39f;accent[1]=.72f;accent[2]=.91f;break;
        case THINKING:accent[0]=.68f;accent[1]=.58f;accent[2]=.88f;break;
        case SPEAKING:accent[0]=.62f;accent[1]=.83f;accent[2]=.74f;break;
        case SUCCESS:accent[0]=.55f;accent[1]=.87f;accent[2]=.63f;break;
        default:accent[0]=.51f;accent[1]=.79f;accent[2]=.72f;
      }
    }
    @Override public void onDrawFrame(GL10 gl){
      long now=System.nanoTime();
      float dt=last==0?.016f:Math.min(.05f,(now-last)/1e9f);last=now;
      time+=dt; moodColors();
      GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT|GLES20.GL_DEPTH_BUFFER_BIT);
      Matrix.setIdentityM(model,0);
      float pulse=1f+.026f*(float)Math.sin(time*1.4f)+energy*.05f;
      Matrix.scaleM(model,0,pulse,pulse,pulse);
      Matrix.rotateM(model,0,time*(mood==FinOrbView.Mood.THINKING?37f:13f),0,1,0);
      Matrix.rotateM(model,0,-17f,1,0,0);
      Matrix.multiplyMM(mvp,0,vp,0,model,0);
      GLES20.glUseProgram(sphereProgram);
      GLES20.glUniformMatrix4fv(GLES20.glGetUniformLocation(sphereProgram,"uMVP"),1,false,mvp,0);
      GLES20.glUniformMatrix4fv(GLES20.glGetUniformLocation(sphereProgram,"uModel"),1,false,model,0);
      GLES20.glUniform3fv(GLES20.glGetUniformLocation(sphereProgram,"uAccent"),1,accent,0);
      GLES20.glUniform1f(GLES20.glGetUniformLocation(sphereProgram,"uTime"),time);
      sphereVertices.position(0);int pos=GLES20.glGetAttribLocation(sphereProgram,"aPos");
      GLES20.glEnableVertexAttribArray(pos);GLES20.glVertexAttribPointer(pos,3,GLES20.GL_FLOAT,false,24,sphereVertices);
      sphereVertices.position(3);int nor=GLES20.glGetAttribLocation(sphereProgram,"aNor");
      GLES20.glEnableVertexAttribArray(nor);GLES20.glVertexAttribPointer(nor,3,GLES20.GL_FLOAT,false,24,sphereVertices);
      GLES20.glDrawElements(GLES20.GL_TRIANGLES,sphereCount,GLES20.GL_UNSIGNED_SHORT,sphereIndices);
      GLES20.glDisableVertexAttribArray(pos);GLES20.glDisableVertexAttribArray(nor);
      // Light trails: 3 independent spatial rings.
      GLES20.glUseProgram(lineProgram);
      GLES20.glUniform3fv(GLES20.glGetUniformLocation(lineProgram,"uAccent"),1,accent,0);
      for(int k=0;k<3;k++){
        Matrix.setIdentityM(model,0);
        Matrix.rotateM(model,0,time*(k%2==0?17f:-11f)+(k*87f),k==0?1:0,k==1?1:0,k==2?1:0);
        Matrix.multiplyMM(mvp,0,vp,0,model,0);
        GLES20.glUniformMatrix4fv(GLES20.glGetUniformLocation(lineProgram,"uMVP"),1,false,mvp,0);
        rings.position(0);int ix=GLES20.glGetAttribLocation(lineProgram,"aPos");
        GLES20.glEnableVertexAttribArray(ix);GLES20.glVertexAttribPointer(ix,3,GLES20.GL_FLOAT,false,0,rings);
        GLES20.glDrawArrays(GLES20.GL_LINE_STRIP,0,240);GLES20.glDisableVertexAttribArray(ix);
      }
      GLES20.glUseProgram(particleProgram);
      Matrix.setIdentityM(model,0);Matrix.rotateM(model,0,-time*9f,0,1,0);
      Matrix.multiplyMM(mvp,0,vp,0,model,0);
      GLES20.glUniformMatrix4fv(GLES20.glGetUniformLocation(particleProgram,"uMVP"),1,false,mvp,0);
      GLES20.glUniform3fv(GLES20.glGetUniformLocation(particleProgram,"uAccent"),1,accent,0);
      GLES20.glUniform1f(GLES20.glGetUniformLocation(particleProgram,"uTime"),time);
      particles.position(0);int pi=GLES20.glGetAttribLocation(particleProgram,"aPos");
      GLES20.glEnableVertexAttribArray(pi);GLES20.glVertexAttribPointer(pi,3,GLES20.GL_FLOAT,false,0,particles);
      GLES20.glDepthMask(false);
      GLES20.glDrawArrays(GLES20.GL_POINTS,0,particleCount);
      GLES20.glDepthMask(true);
      GLES20.glDisableVertexAttribArray(pi);
    }
  }
}
