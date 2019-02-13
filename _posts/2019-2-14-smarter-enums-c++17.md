---
layout: post
title: Smarter enums in c++17
excerpt_separator: <!--more-->
---

Suppose you have an enum, and you'd like to easily convert it to a string. Presently, it's not possible to do so (until the new Reflection feature, at least).
<!--more-->

```cpp
enum class Anchor : char
{
    TOP_LEFT = 0,
    TOP_CENTER,
    TOP_RIGHT
    //...
};

const char* to_string(Anchor anchor)
{
    switch (anchor)
    {
    case Anchor::TOP_LEFT: return "TOP_LEFT";
    case Anchor::TOP_CENTER: return "TOP_CENTER";
    case Anchor::TOP_RIGHT: return "TOP_RIGHT";
    //...
    }
}
```

Maybe for a few enumerations, it's fine. But as the list starts getting bigger, it starts to get out of hand. And if you add a new enumeration, you may forget to update the other list. So, the obvious solution is a macro.

This post is adapted for c++17 from a [StackOverflow answer](https://stackoverflow.com/questions/28828957/enum-to-string-in-modern-c11-c14-c17-and-future-c20).

## Blessed Preprocessors

We want to convert this:

```cpp
ENUM(Anchor, char, TOP_LEFT = 0, TOP_CENTER, TOP_RIGHT);
```

To this:

```cpp
struct Anchor
{
    enum Enum : char { TOP_LEFT = 0, TOP_CENTER, TOP_RIGHT };
    constexpr static size_t COUNT = 3;
    constexpr static char VALUES[] = { TOP_LEFT, TOP_CENTER, TOP_RIGHT };
    constexpr static const char* NAMES[] = { "TOP_LEFT", "TOP_CENTER", "TOP_RIGHT" };
    // ctors, FromString, ToString, etc...

private:
    char value;
};
```

We simply need a macro that looks like so:

```cpp
#define ENUM(name, underlying_type, ...)
```

Simple, right? ...Well, not quite.

## On Variadic Macros

To access the variadic arguments in a macro, one needs to use `__VA_ARGS__`. However, there is one caveat: The entire thing is treated as one token! This means that if you try to for example stringify it with `#__VA_ARGS__`, you'll get:
```cpp
"TOP_LEFT = 0, TOP_CENTER, TOP_RIGHT"
```
when what you really want is:
```cpp
"TOP_LEFT = 0", "TOP_CENTER", "TOP_RIGHT"
```

### Solving the variadic macro problem

The common solution is generic ~macro magic~ that maps a macro to each argument. The following behemoth is an example that maps up to 16 arguments.

```cpp
#define IDENTITY(x) x
#define GLUE(L, R) L##R
#define _GET_NTH(_1,_2,_3,_4,_5,_6,_7,_8,_9,_10,_11,_12,_13,_14,_15,_16,N,...) N
#define COUNT_ARGS(...) IDENTITY(_GET_NTH(__VA_ARGS__,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1,0))

#define _FOREACH_1(m, x)      m(x)
#define _FOREACH_2(m, x, ...) m(x) IDENTITY(_FOREACH_1(m, __VA_ARGS__))
#define _FOREACH_3(m, x, ...) m(x) IDENTITY(_FOREACH_2(m, __VA_ARGS__))
#define _FOREACH_4(m, x, ...) m(x) IDENTITY(_FOREACH_3(m, __VA_ARGS__))
#define _FOREACH_5(m, x, ...) m(x) IDENTITY(_FOREACH_4(m, __VA_ARGS__))
#define _FOREACH_6(m, x, ...) m(x) IDENTITY(_FOREACH_5(m, __VA_ARGS__))
#define _FOREACH_7(m, x, ...) m(x) IDENTITY(_FOREACH_6(m, __VA_ARGS__))
#define _FOREACH_8(m, x, ...) m(x) IDENTITY(_FOREACH_7(m, __VA_ARGS__))
#define _FOREACH_9(m, x, ...) m(x) IDENTITY(_FOREACH_8(m, __VA_ARGS__))
#define _FOREACH_10(m, x, ...) m(x) IDENTITY(_FOREACH_9(m, __VA_ARGS__))
#define _FOREACH_11(m, x, ...) m(x) IDENTITY(_FOREACH_10(m, __VA_ARGS__))
#define _FOREACH_12(m, x, ...) m(x) IDENTITY(_FOREACH_11(m, __VA_ARGS__))
#define _FOREACH_13(m, x, ...) m(x) IDENTITY(_FOREACH_12(m, __VA_ARGS__))
#define _FOREACH_14(m, x, ...) m(x) IDENTITY(_FOREACH_13(m, __VA_ARGS__))
#define _FOREACH_15(m, x, ...) m(x) IDENTITY(_FOREACH_14(m, __VA_ARGS__))
#define _FOREACH_16(m, x, ...) m(x) IDENTITY(_FOREACH_15(m, __VA_ARGS__))

#define _FOREACH_N(macro, N, ...) IDENTITY(GLUE(_FOREACH_, N)(macro, __VA_ARGS__))
#define FOREACH(macro, ...) _FOREACH_N(macro, COUNT_ARGS(__VA_ARGS__), __VA_ARGS__)
```

Hence, we can define the following macros to get the stringified result we want (above).

```cpp
#define STRINGIFY_SINGLE(e) #e,
#define STRINGIFY_EACH(...) IDENTITY(FOREACH(STRINGIFY_SINGLE, __VA_ARGS__))
// STRINGIFY_EACH(a, b, c) => "a","b","c",
```

Okay, but what about the extra comma at the end? It turns out that `{ a, b, c, }` for list initialization *compiles* safely, even with the extra comma at the end (for gcc, clang, and msvc).

## Mapping Names

The final thing to do for mapping the names is to trim the names, so that `TOP_LEFT = 0` becomes `TOP_LEFT`. In c++17, we can do this at compile-time using `std::string_view`.

```cpp
#define TRIM_SINGLE(e) std::string_view{#e}.substr(0, std::string_view{#e}.find_first_of(" =")),
#define TRIM_EACH(...) IDENTITY(FOREACH(TRIM_SINGLE, __VA_ARGS__))
```

```cpp
constexpr static std::string_view NAMES[] = { IDENTITY(TRIM(__VA_ARGS__)) };
```

## Mapping Values

Mapping values is a little bit trickier. The following is a compile error:

```cpp
constexpr static char VALUES[] = { TOP_LEFT = 0, TOP_CENTER, TOP_RIGHT };
// error: lvalue required as left operand of assignment
```

Since you can't assign to an enumeration, the program can't compile. The solution is type-casting: we prepend each argument with a c-style cast to an arbitrary type T which overloads `operator=`, effectively ignoring the assignment, ie. `{ (T)a = 0, (T)b, (T)c, }`.

```cpp
template <typename T>
struct ignore_assign
{
    constexpr explicit ignore_assign(T val) : val{ val } {}
    constexpr operator T() const { return val; } // implicit cast to underlying type
    constexpr const ignore_assign& operator=(T) const { return *this; }
    T val;
};

#define IGNORE_ASSIGN_SINGLE(e) (ignore_assign<UnderlyingType>)e,
#define IGNORE_ASSIGN(...) IDENTITY(FOREACH(IGNORE_ASSIGN_SINGLE, __VA_ARGS__))
```

```cpp
using UnderlyingType = underlying_type;
constexpr static UnderlyingType VALUES[] = { IDENTITY(IGNORE_ASSIGN(__VA_ARGS__)) };
```

## Wrapping Up

To wrap everything up, the following is a basic smarter enum implementation. It should be the definition for the macro `ENUM(name, underlying_type, ...)`. It's shown outside of the macro context for better syntax highlighting.

```cpp
struct name
{
    using UnderlyingType = underlying_type;
    enum Enum : UnderlyingType { __VA_ARGS__ };
    constexpr static size_t COUNT = IDENTITY(COUNT_ARGS(__VA_ARGS__));
    constexpr static UnderlyingType VALUES[] = { IDENTITY(IGNORE_ASSIGN(__VA_ARGS__)) };
    constexpr static std::string_view NAMES[] = { IDENTITY(TRIM(__VA_ARGS__)) };

    name() = delete;

    constexpr name(Enum val)
        : value{ val }
    {}

    template<typename IntegralT>
    constexpr name(IntegralT val)
        : value{ static_cast<UnderlyingType>(val) }
    {}

    constexpr operator Enum() const { return (Enum)value; }

    constexpr std::string_view to_string() const
    {
        for (size_t i = 0; i < COUNT; ++i)
        {
            if (VALUES[i] == value)
                return NAMES[i];
        }
        throw /* bla bla */ ;
    }

    constexpr static name from_string(std::string_view str)
    {
        for (size_t i = 0; i < COUNT; ++i)
        {
            if (NAMES[i] == str)
                return (Enum)VALUES[i];
        }
        throw /* bla bla */ ;
    }

private:
    UnderlyingType value;
};
```