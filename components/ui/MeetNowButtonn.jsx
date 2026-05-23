'use client';

import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

// Shader code for the Liquid Glass effect
const VERTEX_SHADER_SRC = `
  attribute vec2 a_position;
  varying vec2 v_local_uv;
  varying vec2 v_screen_uv;

  uniform vec4 u_button_rect; // [left, top, width, height] in CSS pixels relative to viewport
  uniform vec2 u_screen_size; // [width, height] of the viewport in CSS pixels

  void main() {
      // Maps a_position [-1, -1] to [1, 1] -> [0, 0] to [1, 1] local coordinates
      v_local_uv = vec2(a_position.x, -a_position.y) * 0.5 + 0.5;
      
      // Calculate global screen X and Y coordinates (CSS pixels)
      float screenX = u_button_rect.x + v_local_uv.x * u_button_rect.z;
      float screenY = u_button_rect.y + (1.0 - v_local_uv.y) * u_button_rect.w;
      
      // Map to 0-1 screen UV space (Y inverted for texture sampling)
      v_screen_uv = vec2(screenX / u_screen_size.x, 1.0 - (screenY / u_screen_size.y));
      
      gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SRC = `
  precision mediump float;
  uniform sampler2D u_background;
  uniform vec2 u_resolution; // Viewport resolution in CSS pixels
  uniform vec2 u_mouse;      // Mouse coordinates in CSS pixels (Y from bottom)
  uniform vec2 u_size;       // Button size in CSS pixels
  uniform vec2 u_button_center; // Button center in CSS pixels (Y from bottom)
  uniform float u_dpr;
  uniform float u_hover_intensity; // 0 to 1 transition on hover
  varying vec2 v_local_uv;
  varying vec2 v_screen_uv;

  float roundedBox(vec2 uv, vec2 center, vec2 size, float radius) {
      vec2 q = abs(uv - center) - size + radius;
      return length(max(q, 0.0)) - radius;
  }

  vec3 blurBackground(vec2 uv, vec2 resolution) {
      vec3 result = vec3(0.0);
      float total = 0.0;
      float radius = 3.0;
      for (int x = -3; x <= 3; x++) {
          for (int y = -3; y <= 3; y++) {
              vec2 offset = vec2(float(x), float(y)) * 2.0 / resolution;
              float weight = exp(-(float(x * x + y * y)) / (2.0 * radius));
              result += texture2D(u_background, uv + offset).rgb * weight;
              total += weight;
          }
      }
      return result / total;
  }

  float roundedBoxSDF(vec2 p, vec2 b, float r) {
      vec2 d = abs(p) - b + vec2(r);
      return length(max(d, 0.0)) - r;
  }

  vec2 getNormal(vec2 uv, vec2 center, vec2 size, float radius) {
      vec2 eps = vec2(1.0) / u_resolution * 2.0;
      vec2 p = uv - center;

      float sdfCenter = roundedBoxSDF(p, size, radius);
      float dx = (roundedBoxSDF(p + vec2(eps.x, 0.0), size, radius) - roundedBoxSDF(p - vec2(eps.x, 0.0), size, radius)) * 0.5;
      float dy = (roundedBoxSDF(p + vec2(0.0, eps.y), size, radius) - roundedBoxSDF(p - vec2(0.0, eps.y), size, radius)) * 0.5;

      vec2 gradient = vec2(dx, dy);

      float dxy1 = roundedBoxSDF(p + eps, size, radius);
      float dxy2 = roundedBoxSDF(p - eps, size, radius);
      vec2 diag = vec2(dxy1 - dxy2);

      gradient = mix(gradient, diag, 0.25);

      if (length(gradient) < 0.001) {
          return vec2(0.0);
      }
      return normalize(gradient);
  }

  void main() {
      // Current fragment position in screen-space CSS pixels
      vec2 pixelUV = v_screen_uv * u_resolution; 
      
      // Calculate dynamic button center position
      vec2 center = u_button_center;
      
      // Magnetic sway: move the lens center slightly towards the mouse on hover
      vec2 mouseDiff = u_mouse - u_button_center;
      vec2 sway = clamp(mouseDiff * 0.12, vec2(-12.0), vec2(12.0));
      center += sway * u_hover_intensity;

      vec2 size = u_size * 0.5;
      vec2 local = (pixelUV - center) / size;
      // Aspect ratio correction for local space
      local.y *= u_resolution.x / u_resolution.y;

      float radius = 20.0;
      float dist = roundedBox(pixelUV, center, size, radius);

      // Render standard background texture if outside the button borders
      if (dist > 0.0) {
          gl_FragColor = texture2D(u_background, v_screen_uv);
          return;
      }

      // Radial dome/lens curvature refraction
      float r = clamp(length(local * 1.0), 0.0, 1.0);
      float curvature = pow(r, 1.1);
      vec2 domeNormal = normalize(local) * curvature;
      float eta = 1.0 / 1.48; // glass refractive index
      vec2 incident = -domeNormal;
      vec2 refractVec = refract(incident, domeNormal, eta);
      vec2 curvedRefractUV = v_screen_uv + refractVec * 0.035;

      // Edge refraction contour
      float contourFalloff = exp(-abs(dist) * 0.35);
      vec2 normal = getNormal(pixelUV, center, size, radius);
      vec2 domeNormalContour = normal * pow(contourFalloff, 1.5);
      vec2 refractVecContour = refract(vec2(0.0), domeNormalContour, eta);
      vec2 uvContour = v_screen_uv + refractVecContour * 0.38 * contourFalloff;

      // Blend based on distance from edge and radial distance
      float edgeWeight = smoothstep(0.0, 1.0, abs(dist));
      float radialWeight = smoothstep(0.4, 1.0, r);
      float combinedWeight = clamp((edgeWeight * 1.0) + (-radialWeight * 0.45), 0.0, 1.0);
      vec2 refractUV = mix(curvedRefractUV, uvContour, combinedWeight);

      // Base refraction & frosted glass blur blend
      vec3 refracted = texture2D(u_background, refractUV).rgb;
      vec3 blurred = blurBackground(refractUV, u_resolution);
      vec3 base = mix(refracted, blurred, 0.45 + (u_hover_intensity * 0.1));

      // Dynamic lighting: top highlight & soft dark shadow edge
      float edgeFalloff = smoothstep(0.01, 0.0, dist);
      float verticalBand = 1.0 - smoothstep(-1.5, -0.2, local.y);
      float topShadow = edgeFalloff * verticalBand;
      base = mix(base, vec3(0.0), topShadow * 0.15);

      // Inner white edge highlight for glass reflection
      float edge = 1.0 - smoothstep(0.0, 0.04, dist * -2.0);
      vec3 glow = vec3(0.85);
      vec3 color = mix(base, glow, edge * 0.45);

      // Add a subtle purple/pink glass tint matching the theme
      vec3 tint = vec3(0.65, 0.4, 0.85);
      color = mix(color, tint, 0.08);

      gl_FragColor = vec4(color, 1.0);
  }
`;

export default function MeetNowButtonn({
  onClick,
  isSearching = false,
  className = "",
  text = "Meet Someone now",
  searchingText = "Searching...",
  isVideoOn = true,
  onVideoClick = null,
  borderClass = "",
  textClass = "",
  iconClass = "",
  containerClass = "",
  bgImage = "/bg.jpg" // Default background image matching DesktopHome.jsx
}) {
  const buttonRef = useRef(null);
  const canvasRef = useRef(null);
  const [webGlSupported, setWebGlSupported] = useState(true);
  const [hoverIntensity, setHoverIntensity] = useState(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  // Handle tracking of mouse coords relative to viewport
  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseRef.current = {
        x: e.clientX,
        y: e.clientY
      };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // WebGL Render Loop setup
  useEffect(() => {
    if (isSearching || !webGlSupported) return;

    const canvas = canvasRef.current;
    const button = buttonRef.current;
    if (!canvas || !button) return;

    const gl = canvas.getContext('webgl', { antialias: true, alpha: true }) || 
               canvas.getContext('experimental-webgl', { antialias: true, alpha: true });
    
    if (!gl) {
      setWebGlSupported(false);
      return;
    }

    // Helper functions for WebGL compiling
    const compileShader = (type, src) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);

    if (!vertexShader || !fragmentShader) {
      setWebGlSupported(false);
      return;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      setWebGlSupported(false);
      return;
    }

    gl.useProgram(program);

    // Setup coordinates quad [-1, -1] to [1, 1]
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations lookup
    const uBackgroundLoc = gl.getUniformLocation(program, 'u_background');
    const uResolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    const uMouseLoc = gl.getUniformLocation(program, 'u_mouse');
    const uSizeLoc = gl.getUniformLocation(program, 'u_size');
    const uButtonCenterLoc = gl.getUniformLocation(program, 'u_button_center');
    const uDprLoc = gl.getUniformLocation(program, 'u_dpr');
    const uHoverLoc = gl.getUniformLocation(program, 'u_hover_intensity');
    const uButtonRectLoc = gl.getUniformLocation(program, 'u_button_rect');
    const uScreenSizeLoc = gl.getUniformLocation(program, 'u_screen_size');

    // Create & bind background texture
    const texture = gl.createTexture();
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = bgImage;

    let textureLoaded = false;
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      textureLoaded = true;
    };

    let animationFrameId;
    let localHoverIntensity = 0;

    const render = () => {
      if (!textureLoaded) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const rect = button.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Update Canvas size to match DPR
      const width = rect.width;
      const height = rect.height;
      
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      gl.clear(gl.COLOR_BUFFER_BIT);

      // Check current hover state and interpolate
      const targetHover = button.matches(':hover') ? 1.0 : 0.0;
      localHoverIntensity += (targetHover - localHoverIntensity) * 0.15;

      // Coordinate computations
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      // Calculate mouse Y in WebGL Y-up space
      const webglMouseX = mouseRef.current.x;
      const webglMouseY = screenHeight - mouseRef.current.y;

      const buttonCenterX = rect.left + rect.width * 0.5;
      const buttonCenterY = screenHeight - (rect.top + rect.height * 0.5);

      // Pass all uniforms
      gl.uniform1i(uBackgroundLoc, 0);
      gl.uniform2f(uResolutionLoc, screenWidth, screenHeight);
      gl.uniform2f(uMouseLoc, webglMouseX, webglMouseY);
      gl.uniform2f(uSizeLoc, rect.width, rect.height);
      gl.uniform2f(uButtonCenterLoc, buttonCenterX, buttonCenterY);
      gl.uniform1f(uDprLoc, dpr);
      gl.uniform1f(uHoverLoc, localHoverIntensity);
      
      // rect params: [left, top, width, height]
      gl.uniform4f(uButtonRectLoc, rect.left, rect.top, rect.width, rect.height);
      gl.uniform2f(uScreenSizeLoc, screenWidth, screenHeight);

      // Draw standard triangles
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Clean up WebGL resources
    return () => {
      cancelAnimationFrame(animationFrameId);
      gl.deleteBuffer(positionBuffer);
      gl.deleteTexture(texture);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, [isSearching, webGlSupported, bgImage]);

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      disabled={isSearching}
      className={clsx(
        'group relative z-20 border flex items-center justify-center gap-4 active:scale-[0.98] transition-all overflow-hidden shadow-2xl transition-all duration-300',
        isSearching
          ? 'bg-yellow-500/80 text-black border-black animate-pulse cursor-wait'
          : 'bg-transparent text-white border-white/30 hover:border-white/50 cursor-pointer shadow-purple-500/10 hover:shadow-purple-500/20 hover:scale-[1.01]',
        borderClass,
        containerClass,
        className
      )}
    >
      {/* Liquid Glass Canvas overlay */}
      {!isSearching && webGlSupported && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-0 pointer-events-none w-full h-full object-cover"
        />
      )}

      {/* Pure CSS fallback if WebGL is not supported */}
      {!isSearching && !webGlSupported && (
        <div 
          className="absolute inset-0 z-0 bg-[#0A032D]/35 backdrop-blur-[14px] saturate-[150%]"
          style={{
            backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
          }}
        />
      )}

      {/* Subtle dynamic background gradient overlay for extra depth */}
      {!isSearching && (
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-purple-500/10 opacity-30 mix-blend-overlay pointer-events-none z-[1]" />
      )}

      {/* Inner Video Toggle Circle */}
      <div
        onClick={(e) => {
          if (onVideoClick) {
            e.stopPropagation();
            onVideoClick();
          }
        }}
        className={clsx(
          "w-[clamp(36px,10vw,46px)] h-[clamp(36px,10vw,46px)] rounded-full border flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-10",
          onVideoClick ? "cursor-pointer" : "cursor-default",
          isSearching ? "border-black bg-black/5" : "border-white/40 bg-white/5 backdrop-blur-md"
        )}
      >
        <img
          src={isVideoOn ? "/assets/video-on.svg" : "/assets/video-off.svg"}
          className={clsx(
            "transition-all",
            iconClass,
            isSearching ? "brightness-0" : ""
          )}
          alt="video toggle"
        />
      </div>

      {/* Button Text Label */}
      <span
        className={clsx(
          "z-10 font-bold leading-none font-outfit select-none",
          "text-[clamp(14px,4vw,22px)]",
          isSearching ? "text-black" : "text-white tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]",
          textClass
        )}
      >
        {isSearching ? searchingText : text}
      </span>
    </button>
  );
}