import React, { useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Ionicons } from "@expo/vector-icons";

// Test video URLs (these are public test videos)
const TEST_VIDEOS = [
  {
    id: "test1",
    uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    title: "Big Buck Bunny (MP4)",
  },
  {
    id: "test2",
    uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    title: "Elephants Dream (MP4)",
  },
];

export default function VideoTestComponent() {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const videoPlayer = useVideoPlayer(selectedVideo, (player) => {
    if (selectedVideo) {
      player.play();
      setIsPlaying(true);
    }
  });

  const handleVideoSelect = (videoUri: string) => {
    setSelectedVideo(videoUri);
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (videoPlayer) {
      if (isPlaying) {
        videoPlayer.pause();
        setIsPlaying(false);
      } else {
        videoPlayer.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <View className="p-4 bg-surface-900">
      <Text className="text-text-primary text-lg font-bold mb-4">Video Test Component</Text>

      {/* Video Selection */}
      <View className="mb-4">
        <Text className="text-text-secondary mb-2">Select a test video:</Text>
        {TEST_VIDEOS.map((video) => (
          <Pressable
            key={video.id}
            onPress={() => handleVideoSelect(video.uri)}
            className={`p-3 mb-2 rounded-lg border ${
              selectedVideo === video.uri ? "bg-primary-600 border-primary-500" : "bg-surface-800 border-border"
            }`}
          >
            <Text className={`font-medium ${selectedVideo === video.uri ? "text-white" : "text-text-primary"}`}>
              {video.title}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Video Player */}
      {selectedVideo && (
        <View className="mb-4">
          <Text className="text-text-secondary mb-2">Video Player:</Text>
          <View className="bg-black rounded-lg overflow-hidden">
            <VideoView
              player={videoPlayer}
              style={{ width: "100%", height: 200 }}
              allowsFullscreen
              nativeControls
              contentFit="contain"
            />
          </View>

          {/* Custom Controls */}
          <View className="flex-row items-center justify-center mt-2">
            <Pressable onPress={togglePlayback} className="bg-primary-600 px-4 py-2 rounded-lg flex-row items-center">
              <Ionicons name={isPlaying ? "pause" : "play"} size={16} color="white" />
              <Text className="text-white ml-2 font-medium">{isPlaying ? "Pause" : "Play"}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Instructions */}
      <View className="bg-surface-800 p-3 rounded-lg">
        <Text className="text-text-secondary text-sm">
          <Text className="font-medium">Instructions:</Text>
          {"\n"}
          1. Select a test video above{"\n"}
          2. Video should load and start playing automatically{"\n"}
          3. Use native controls or custom play/pause button{"\n"}
          4. Tap fullscreen icon for full-screen playback
        </Text>
      </View>
    </View>
  );
}
