import AVFoundation
import Foundation

struct PoemEntry: Codable {
    var id: String
    var tone: String
    var title: String
    var order: Int
    var text: String
    var audio: String?
    var lineTimings: [[Double]]?
}

func cleanSpokenLine(_ rawLine: String) -> String {
    var s = rawLine
        .replacingOccurrences(of: "&", with: " and ")
        .replacingOccurrences(of: "…", with: ", ")
        .replacingOccurrences(of: "...", with: ", ")
        .replacingOccurrences(of: "—", with: ", ")
        .replacingOccurrences(of: "–", with: ", ")
    s = s.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
        .trimmingCharacters(in: .whitespacesAndNewlines)
    s = s.replacingOccurrences(of: "[\\s.…,;:!?\\u2014\\u2013-]+$", with: "", options: .regularExpression)
        .trimmingCharacters(in: .whitespacesAndNewlines)
    if s.isEmpty { return "" }
    return "\(s)."
}

let fm = FileManager.default
let root = URL(fileURLWithPath: fm.currentDirectoryPath)
let indexUrl = root.appendingPathComponent("content/poems/index.json")
let audioDir = root.appendingPathComponent("content/poems/audio")
try fm.createDirectory(at: audioDir, withIntermediateDirectories: true)

let onlyIds = Set(CommandLine.arguments.dropFirst())
if !onlyIds.isEmpty {
    fputs("Filtering to \(onlyIds.sorted().joined(separator: ", "))\n", stderr)
}

let data = try Data(contentsOf: indexUrl)
var poems = try JSONDecoder().decode([PoemEntry].self, from: data)

guard let voice = AVSpeechSynthesisVoice(identifier: "com.apple.voice.compact.en-US.Samantha")
    ?? AVSpeechSynthesisVoice(language: "en-US") else {
    fputs("No en-US voice found\n", stderr)
    exit(1)
}

let sampleRate = 22050.0
let leadPad = Int(0.06 * sampleRate)
let gapSamples = Int(0.42 * sampleRate)
let tailPad = Int(0.12 * sampleRate)
let fadeInLen = Int(0.020 * sampleRate)
let fadeOutLen = Int(0.075 * sampleRate)

let tStart = Date()

for idx in 0..<poems.count {
    let poem = poems[idx]
    if !onlyIds.isEmpty && !onlyIds.contains(poem.id) { continue }
    let rawLines = poem.text
        .components(separatedBy: .newlines)
        .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        .filter { !$0.isEmpty }

    var fullPcm = [Float](repeating: 0, count: leadPad)
    var timings: [[Double]] = []

    for rawLine in rawLines {
        let spoken = cleanSpokenLine(rawLine)
        if spoken.isEmpty {
            let startSec = Double(fullPcm.count) / sampleRate
            fullPcm.append(contentsOf: [Float](repeating: 0, count: gapSamples))
            let endSec = Double(fullPcm.count) / sampleRate
            timings.append([round(startSec * 10000) / 10000, round(endSec * 10000) / 10000])
            continue
        }

        let synth = AVSpeechSynthesizer()
        let utt = AVSpeechUtterance(string: spoken)
        utt.voice = voice
        var raw: [Float] = []
        var done = false
        synth.write(utt) { buf in
            guard let pcm = buf as? AVAudioPCMBuffer else { return }
            if pcm.frameLength == 0 {
                done = true
                return
            }
            if let ch = pcm.floatChannelData?[0] {
                raw.append(contentsOf: UnsafeBufferPointer(start: ch, count: Int(pcm.frameLength)))
            }
        }
        let deadline = Date(timeIntervalSinceNow: 15.0)
        while !done && Date() < deadline {
            RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.004))
        }

        if raw.isEmpty {
            let startSec = Double(fullPcm.count) / sampleRate
            fullPcm.append(contentsOf: [Float](repeating: 0, count: gapSamples))
            let endSec = Double(fullPcm.count) / sampleRate
            timings.append([round(startSec * 10000) / 10000, round(endSec * 10000) / 10000])
            continue
        }

        // Remove any DC offset
        let mean = raw.reduce(0, +) / Float(raw.count)
        for k in 0..<raw.count {
            raw[k] -= mean
        }

        var first = 0
        while first < raw.count && abs(raw[first]) <= 0.003 { first += 1 }
        first = max(0, first - fadeInLen)

        var last = raw.count - 1
        while last > first && abs(raw[last]) <= 0.0025 { last -= 1 }
        last = min(raw.count - 1, last + Int(0.055 * sampleRate))

        var packet = Array(raw[first...last])
        let n = packet.count
        if n > 4 {
            let fi = min(fadeInLen, n / 3)
            if fi > 1 {
                for j in 0..<fi {
                    let w = Float(0.5 * (1.0 - cos(Double.pi * Double(j) / Double(fi))))
                    packet[j] *= w
                }
            }
            let fo = min(fadeOutLen, n / 2)
            if fo > 1 {
                for j in 0..<fo {
                    let w = Float(0.5 * (1.0 + cos(Double.pi * Double(j) / Double(fo))))
                    packet[n - fo + j] *= w
                }
            }
            packet[0] = 0
            packet[n - 1] = 0
        }

        let startSec = Double(fullPcm.count) / sampleRate
        fullPcm.append(contentsOf: packet)
        let endSec = Double(fullPcm.count) / sampleRate
        timings.append([round(startSec * 10000) / 10000, round(endSec * 10000) / 10000])
        fullPcm.append(contentsOf: [Float](repeating: 0, count: gapSamples))
    }

    fullPcm.append(contentsOf: [Float](repeating: 0, count: tailPad))

    let tmpWav = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("poem-\(poem.id).wav")
    let outM4a = audioDir.appendingPathComponent("\(poem.id).m4a")
    try? fm.removeItem(at: tmpWav)
    try? fm.removeItem(at: outM4a)

    do {
        let format = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: sampleRate, channels: 1, interleaved: false)!
        let outBuf = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(fullPcm.count))!
        outBuf.frameLength = AVAudioFrameCount(fullPcm.count)
        memcpy(outBuf.floatChannelData![0], fullPcm, fullPcm.count * MemoryLayout<Float>.size)
        let file = try AVAudioFile(forWriting: tmpWav, settings: format.settings)
        try file.write(from: outBuf)
    }

    let proc = Process()
    proc.executableURL = URL(fileURLWithPath: "/usr/bin/afconvert")
    proc.arguments = ["-f", "m4af", "-d", "aac", "-b", "40000", tmpWav.path, outM4a.path]
    try proc.run()
    proc.waitUntilExit()
    try? fm.removeItem(at: tmpWav)

    if proc.terminationStatus != 0 {
        fputs("afconvert failed for \(poem.id)\n", stderr)
        exit(1)
    }

    poems[idx].audio = "content/poems/audio/\(poem.id).m4a"
    poems[idx].lineTimings = timings
    print(String(format: "[%02d/%02d] %@ (%d lines, %.1fs)", idx + 1, poems.count, poem.id, rawLines.count, Double(fullPcm.count) / sampleRate))
}

let enc = JSONEncoder()
enc.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
var outData = try enc.encode(poems)
outData.append(0x0A)
try outData.write(to: indexUrl)
print(String(format: "Done in %.1fs", Date().timeIntervalSince(tStart)))
